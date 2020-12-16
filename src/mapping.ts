import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
} from "../generated/Contract/Contract";
import { Arrival, ArrivalsAtInterval, Meta, Player, Planet, Hat, Upgrade } from "../generated/schema";

// NOTE: the timestamps within are all unix epoch in seconds NOT MILLISECONDS
// like in all the JS code where youll see divided by contractPrecision. As a
// result be very careful with your copy pastes. And TODO, unify the codebases

// A lot of the Math fn aren't available as BigInt so we get out of BigInt from
// the contract asap where possible. However due to overflows we cast variables
// to f64 during calculations then back to i32 at the end avoid overflows.

function toSpaceType(spaceType: string): string {
    if (spaceType == "0") {
        return "NEBULA";
    } else if (spaceType == "1") {
        return "SPACE";
    } else {
        return "DEEP_SPACE";
    }
}

function toPlanetResource(planetResource: string): string {
    if (planetResource == "0") {
        return "NONE";
    } else {
        return "SILVER";
    }
}

export function handlePlayerInitialized(event: PlayerInitialized): void {
    let contract = Contract.bind(event.address);
    let locationDec = event.params.loc;

    // todo 0 pad??
    let player = new Player(event.params.player.toHexString());
    player.initTimestamp = event.block.timestamp.toI32();
    player.homeWorld = locationDec.toHexString();
    player.save();

    let planet = loadPlanetFromContract(contract, locationDec);
    planet.save();
}

export function handleBlock(block: ethereum.Block): void {

    // todo get this from subgraph.yaml or elsewhere somehow?
    let contract = Contract.bind(Address.fromString("0xa8688cCF5E407C1C782CF0c19b3Ab2cE477Fd739"));

    let current = block.timestamp.toI32();

    // first call setup and global to hold the last timestap we processed
    let meta = setup(current);

    // process last+1 up to and including current
    for (let i = meta.lastProcessed + 1; i <= current; i++) {
        let bucket = ArrivalsAtInterval.load(i.toString());
        if (bucket !== null) {

            // multiple arrivals are in order of arrivalid
            let arrivals = bucket.arrivals.map<Arrival | null>(aid => Arrival.load(aid));

            for (let i = 0; i < arrivals.length; i++) {

                let a = arrivals[i];

                let planet = Planet.load(a.toPlanet);
                planet = arrive(planet, a);
                planet.save();

                a.processedAt = current;
                a.save();
            }
        }
    }

    meta.lastProcessed = current;
    meta.save();
}

export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);

    let rawPlanet = contract.planets(event.params.loc);
    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);

    let planet = Planet.load(event.params.loc.toHexString());
    // refresh
    planet.lastUpdated = planetExtendedInfo.value2.toI32();
    planet.population = rawPlanet.value4.toI32();
    planet.silver = rawPlanet.value10.toI32();
    // apply hat
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.save();

    let hat = new Hat(event.params.loc.toHexString())
    hat.player = planet.owner;
    hat.planet = planet.id;
    hat.hatLevel = planet.hatLevel;
    hat.timestamp = planet.lastUpdated;
    hat.save()
}

export function handleArrivalQueued(event: ArrivalQueued): void {
    let contract = Contract.bind(event.address);

    let rawArrival = contract.planetArrivals(event.params.arrivalId);

    let fromPlanetDec = rawArrival.value2;
    //always exists
    let fromPlanet = Planet.load(fromPlanetDec.toHexString());
    //refresh
    let rawFromPlanet = contract.planets(fromPlanetDec);
    let fromPlanetExtendedInfo = contract.planetsExtendedInfo(fromPlanetDec);
    fromPlanet.lastUpdated = fromPlanetExtendedInfo.value2.toI32();
    fromPlanet.population = rawFromPlanet.value4.toI32();
    fromPlanet.silver = rawFromPlanet.value10.toI32();
    fromPlanet.save()

    let toPlanetDec = rawArrival.value3
    let toPlanet = Planet.load(toPlanetDec.toHexString());
    // might not exist for us yet
    if (toPlanet === null) {
        toPlanet = loadPlanetFromContract(contract, toPlanetDec);
    } else {
        // if we didnt just get it from contract, refresh it
        let rawToPlanet = contract.planets(toPlanetDec);
        let toPlanetExtendedInfo = contract.planetsExtendedInfo(toPlanetDec);
        toPlanet.lastUpdated = toPlanetExtendedInfo.value2.toI32();
        toPlanet.population = rawToPlanet.value4.toI32();
        toPlanet.silver = rawToPlanet.value10.toI32();
        toPlanet.save();
    }

    let arrival = new Arrival(event.params.arrivalId.toString());
    arrival.arrivalId = event.params.arrivalId.toI32();
    arrival.player = rawArrival.value1.toHexString();
    arrival.fromPlanet = fromPlanet.id;
    arrival.toPlanet = toPlanet.id;
    arrival.popArriving = rawArrival.value4.toI32();
    arrival.silverMoved = rawArrival.value5.toI32();
    arrival.departureTime = rawArrival.value6.toI32();
    arrival.arrivalTime = rawArrival.value7.toI32();
    arrival.receivedAt = event.block.timestamp.toI32();
    arrival.save()

    // put the arrival in an array keyed by its arrivalTime to be later processed by handleBlock
    let bucketTime = arrival.arrivalTime;
    let bucket = ArrivalsAtInterval.load(bucketTime.toString());
    let arrivals: String[] = [];
    if (bucket === null) {
        bucket = new ArrivalsAtInterval(bucketTime.toString());
    } else {
        arrivals = bucket.arrivals;
    }
    arrivals.push(arrival.id);
    bucket.arrivals = arrivals;
    bucket.save();
}

//planet hasHarvestedArtifact new column

export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);

    let rawPlanet = contract.planets(event.params.loc);
    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);

    let planet = Planet.load(event.params.loc.toHexString());
    // refresh
    planet.population = rawPlanet.value4.toI32();
    planet.silver = rawPlanet.value10.toI32();
    planet.lastUpdated = planetExtendedInfo.value2.toI32();
    // apply upgrade
    planet.upgradeState0 = planetExtendedInfo.value5.toI32();
    planet.upgradeState1 = planetExtendedInfo.value6.toI32();
    planet.upgradeState2 = planetExtendedInfo.value7.toI32();
    // recalculate silver spent
    planet.silverSpentComputed = calculateSilverSpent(planet);
    planet.save();

    //using planet hex location as id because nothing else to index by
    let upgrade = new Upgrade(planet.id);
    upgrade.player = planet.owner;
    //also tying it to a planet
    upgrade.planet = planet.id;
    upgrade.timestamp = planet.lastUpdated;
    upgrade.save()
}

// todo can I type these to not be null somehow?
function calculateSilverSpent(planet: Planet | null): i32 {
    let upgradeState: i32[] = [
        planet.upgradeState0,
        planet.upgradeState1,
        planet.upgradeState2,
    ];

    // todo hardcoded?
    let upgradeCosts: i32[] = [20, 40, 60, 80, 100];
    let totalUpgrades = 0;
    for (let i = 0; i < upgradeState.length; i++) {
        totalUpgrades += upgradeState[i];
    }
    let totalUpgradeCostPercent = 0;
    for (let i = 0; i < totalUpgrades; i++) {
        totalUpgradeCostPercent += upgradeCosts[i];
    }

    return (totalUpgradeCostPercent / 100) * planet.silverCap;
}

function hasOwner(planet: Planet | null): boolean {
    return planet.owner !== "0x0000000000000000000000000000000000000000";
};

function getSilverOverTime(
    planet: Planet | null,
    startTimeS: i32,
    endTimeS: i32
): i32 {

    if (!hasOwner(planet)) {
        return planet.silver;
    }

    if (planet.silver > planet.silverCap) {
        return planet.silverCap;
    }

    let timeElapsed: f64 = endTimeS - startTimeS;
    let silverGrowth: f64 = planet.silverGrowth;
    let silver: f64 = planet.silver;
    let silverCap: f64 = planet.silverCap;

    return Math.min(
        timeElapsed * silverGrowth + silver,
        silverCap
    ) as i32;
}

function getEnergyAtTime(planet: Planet | null, atTimeS: i32): i32 {
    if (planet.population === 0) {
        return 0;
    }

    if (!hasOwner(planet)) {
        return planet.population;
    }

    let population: f64 = planet.population;
    let populationCap: f64 = planet.populationCap;
    let populationGrowth: f64 = planet.populationGrowth;
    let timeElapsed: f64 = atTimeS - planet.lastUpdated;

    let denominator: f64 = (Math.exp((-4 * populationGrowth * timeElapsed) / populationCap) *
        (populationCap / population - 1) + 1);
    return (populationCap / denominator) as i32;
}

function updatePlanetToTime(planet: Planet | null, atTimeS: i32): Planet | null {
    // todo hardcoded game endtime 
    // let safeEndS = Math.min(atTimeS, 1609372800) as i32;
    // if (safeEndS < planet.lastUpdated) {
    //     // console.error('tried to update planet to a past time');
    //     return planet;
    // }
    planet.silver = getSilverOverTime(
        planet,
        planet.lastUpdated,
        atTimeS
    );
    planet.population = getEnergyAtTime(planet, atTimeS);
    planet.lastUpdated = atTimeS;
    return planet;
}

function arrive(toPlanetDec: Planet | null, arrival: Arrival | null): Planet | null {

    // update toPlanetDec energy and silver right before arrival
    toPlanetDec = updatePlanetToTime(toPlanetDec, arrival.arrivalTime);

    // apply energy
    let shipsMoved = arrival.popArriving;

    if (arrival.player !== toPlanetDec.owner) {
        // attacking enemy - includes emptyAddress

        if (toPlanetDec.population > Math.floor((shipsMoved * 100) / toPlanetDec.defense) as i32) {
            // attack reduces target planet's garrison but doesn't conquer it
            toPlanetDec.population -= Math.floor((shipsMoved * 100) / toPlanetDec.defense) as i32;
        } else {
            // conquers planet
            toPlanetDec.owner = arrival.player;
            toPlanetDec.population = shipsMoved - Math.floor((toPlanetDec.population * toPlanetDec.defense) / 100) as i32;
        }
    } else {
        // moving between my own planets
        toPlanetDec.population += shipsMoved;
    }

    // apply silver
    if (toPlanetDec.silver + arrival.silverMoved > toPlanetDec.silverCap) {
        toPlanetDec.silver = toPlanetDec.silverCap;
    } else {
        toPlanetDec.silver += arrival.silverMoved;
    }

    return toPlanetDec;
}

// todo pull refresh out to its own fn call. if it doesnt cost any extra
// contract calls
function loadPlanetFromContract(contract: Contract | null, locationDec: BigInt): Planet | null {

    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);
    let planet = new Planet(locationDec.toHexString());
    planet.locationDec = locationDec;
    planet.owner = rawPlanet.value0.toHexString();;
    planet.isInitialized = planetExtendedInfo.value0;
    planet.createdAt = planetExtendedInfo.value1.toI32();
    planet.lastUpdated = planetExtendedInfo.value2.toI32();
    planet.perlin = planetExtendedInfo.value3.toI32();
    planet.range = rawPlanet.value1.toI32();
    planet.speed = rawPlanet.value2.toI32();
    planet.defense = rawPlanet.value3.toI32();
    planet.population = rawPlanet.value4.toI32();
    planet.populationCap = rawPlanet.value5.toI32();
    planet.populationGrowth = rawPlanet.value6.toI32();
    planet.silverCap = rawPlanet.value8.toI32();
    planet.silverGrowth = rawPlanet.value9.toI32();
    planet.silver = rawPlanet.value10.toI32();
    planet.planetLevel = rawPlanet.value11.toI32();
    planet.upgradeState0 = planetExtendedInfo.value5.toI32();
    planet.upgradeState1 = planetExtendedInfo.value6.toI32();
    planet.upgradeState2 = planetExtendedInfo.value7.toI32();
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.silverSpentComputed = 0;
    planet.planetResource = toPlanetResource(rawPlanet.value7.toString());
    planet.spaceType = toSpaceType(planetExtendedInfo.value4.toString());
    return planet;
}

function setup(timestamp: i32): Meta | null {

    let meta = Meta.load("0");

    if (meta === null) {
        meta = new Meta("0");
        meta.lastProcessed = timestamp;

        let player = new Player("0x0000000000000000000000000000000000000000");
        player.initTimestamp = timestamp;
        player.save();

    }
    return meta;
}