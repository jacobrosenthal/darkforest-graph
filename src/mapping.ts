import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
} from "../generated/Contract/Contract";
import { Arrival, ArrivalsAtInterval, Meta, Player, Planet } from "../generated/schema";

// NOTE: the timestamps within are all unix epoch in seconds NOT MILLISECONDS
// like in all the JS code where youll see divided by contractPrecision. As a
// result be very careful with your copy pastes. And TODO, unify the codebases

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
    let locationid = event.params.loc;

    let player = new Player(event.params.player.toHexString());
    player.initTimestamp = event.block.timestamp.toI32();
    player.homeWorld = locationid.toString();
    player.save();

    let planet = newPlanet(contract, locationid, player.id);
    planet.save();
}

export function handleBlock(block: ethereum.Block): void {

    // todo get this from subgraph.yaml or elsewhere somehow?
    let contract = Contract.bind(Address.fromString("0xa8688cCF5E407C1C782CF0c19b3Ab2cE477Fd739"));

    let current = block.timestamp.toI32();

    // dummy arrival sadly all just to hold the last timestap we processed lastProcessed
    let meta = loadMeta(current);

    // process last+1 up to and including current
    for (let i = meta.lastProcessed + 1; i <= current; i++) {
        let bucket = ArrivalsAtInterval.load(i.toString());
        if (bucket !== null) {

            // multiple arrivals are in order of arrivalid
            let arrivals = bucket.arrivals.map<Arrival | null>(aid => Arrival.load(aid));

            for (let i = 0; i < arrivals.length; i++) {

                let a = arrivals[i];
                let planet = Planet.load(a.toPlanet.toString());
                if (planet === null) {
                    planet = newPlanet(contract, a.toPlanet, "0000000000000000000000000000000000000000");
                }

                planet = arrive(planet, a);
                // todo do we always save it, because even if they didnt own it,
                // interacting with it has changed its numbers?
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
    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);
    let planet = Planet.load(event.params.loc.toString());
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.save();
}

export function handleArrivalQueued(event: ArrivalQueued): void {
    let contract = Contract.bind(event.address);

    let rawArrival = contract.planetArrivals(event.params.arrivalId);
    let arrival = new Arrival(event.params.arrivalId.toString());
    arrival.arrivalId = event.params.arrivalId.toI32();
    arrival.player = rawArrival.value1.toHexString();
    arrival.fromPlanet = rawArrival.value2; // todo show as locationIdFromDecStr?
    arrival.toPlanet = rawArrival.value3; // todo show as locationIdFromDecStr?
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

export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);

    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);
    let planet = Planet.load(event.params.loc.toString());
    planet.lastUpdated = planetExtendedInfo.value2.toI32();
    planet.upgradeState0 = planetExtendedInfo.value5.toI32();
    planet.upgradeState1 = planetExtendedInfo.value6.toI32();
    planet.upgradeState2 = planetExtendedInfo.value7.toI32();
    planet.silverSpentComputed = calculateSilverSpent(planet);
    planet.save();
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
    // planet.owner should never be null
    return planet.owner !== "0000000000000000000000000000000000000000";
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
    let timeElapsed = endTimeS - startTimeS;

    return Math.min(
        timeElapsed * planet.silverGrowth + planet.silver,
        planet.silverCap
    ) as i32;
}

function getEnergyAtTime(planet: Planet | null, atTimeS: i32): i32 {
    if (planet.population === 0) {
        return 0;
    }

    if (!hasOwner(planet)) {
        return planet.population;
    }

    let timeElapsed = atTimeS - planet.lastUpdated;

    let denominator = (Math.exp((-4 * planet.populationGrowth * timeElapsed) / planet.populationCap) *
        (planet.populationCap / planet.population - 1) + 1);
    return (planet.populationCap / denominator) as i32;
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

function arrive(toPlanet: Planet | null, arrival: Arrival | null): Planet | null {

    // update toPlanet energy and silver right before arrival
    toPlanet = updatePlanetToTime(toPlanet, arrival.arrivalTime);

    // apply energy
    let shipsMoved = arrival.popArriving;

    if (arrival.player !== toPlanet.owner) {
        // attacking enemy - includes emptyAddress

        if (toPlanet.population > Math.floor((shipsMoved * 100) / toPlanet.defense) as i32) {
            // attack reduces target planet's garrison but doesn't conquer it
            toPlanet.population -= Math.floor((shipsMoved * 100) / toPlanet.defense) as i32;
        } else {
            // conquers planet
            toPlanet.owner = arrival.player;
            toPlanet.population = shipsMoved - Math.floor((toPlanet.population * toPlanet.defense) / 100) as i32;
        }
    } else {
        // moving between my own planets
        toPlanet.population += shipsMoved;
    }

    // apply silver
    if (toPlanet.silver + arrival.silverMoved > toPlanet.silverCap) {
        toPlanet.silver = toPlanet.silverCap;
    } else {
        toPlanet.silver += arrival.silverMoved;
    }

    return toPlanet;
}

function newPlanet(contract: Contract | null, locationid: BigInt, ownerid: String): Planet | null {

    let rawPlanet = contract.planets(locationid);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationid);
    let planet = new Planet(locationid.toString());
    planet.owner = ownerid;
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

function loadMeta(timestamp: i32): Meta | null {

    let meta = Meta.load("0");
    if (meta === null) {
        meta = new Meta("0");
        meta.lastProcessed = timestamp;
    }
    return meta;
}