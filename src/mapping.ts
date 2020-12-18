import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
    Contract__planetsExtendedInfoResult,
    Contract__planetsResult
} from "../generated/Contract/Contract";
import { Arrival, PendingArrivalQueue, Meta, Player, Planet, UnprocessedArrivalIdQueue, Hat, Upgrade } from "../generated/schema";

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

    // params.player is an address which gets 0x prefixed and 0 padded in toHexString
    let player = new Player(event.params.player.toHexString());
    player.initTimestamp = event.block.timestamp.toI32();
    player.homeWorld = locationDecToLocationId(locationDec);
    player.save();

    let planet = newPlanet(locationDec, contract);
    planet.save();
}

export function handleBlock(block: ethereum.Block): void {

    // todo get this from subgraph.yaml or elsewhere somehow?
    let contract = Contract.bind(Address.fromString("0xa8688cCF5E407C1C782CF0c19b3Ab2cE477Fd739"));

    let current = block.timestamp.toI32();

    // first call setup and global to hold the last timestap we processed
    let meta = setup(current);

    processArrivals(meta, current, contract);

    scheduleArrivalsAndRefresh(current, contract);

    meta.lastProcessed = current;
    meta.save();
}

export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let locationid = locationDecToLocationId(locationDec);

    let planet = Planet.load(locationid);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();

    let hat = new Hat(locationid)
    hat.player = planet.owner;
    hat.planet = planet.id;
    hat.hatLevel = planet.hatLevel;
    hat.timestamp = planet.lastUpdated;
    hat.save();
}

export function handleArrivalQueued(event: ArrivalQueued): void {
    //schedule arrivals to be processed in bulk in handler
    let current = event.block.timestamp;
    let unprocessed = UnprocessedArrivalIdQueue.load(current.toString());
    let arrivalIds: BigInt[] = [];
    if (unprocessed === null) {
        unprocessed = new UnprocessedArrivalIdQueue(current.toString());
    } else {
        arrivalIds = unprocessed.arrivalIds;
    }
    arrivalIds.push(event.params.arrivalId);
    unprocessed.arrivalIds = arrivalIds;
    unprocessed.save();
}

//planet hasHarvestedArtifact new column

export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let planet = Planet.load(locationDecToLocationId(locationDec));
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    // recalculate silver spent
    planet.silverSpentComputed = calculateSilverSpent(planet);
    planet.save();

    //using planet hex location as id because nothing else to index by
    let upgrade = new Upgrade(planet.id);
    upgrade.player = planet.owner;
    //also tying it to a planet
    upgrade.planet = planet.id;
    upgrade.timestamp = planet.lastUpdated;
    upgrade.save();
}


function scheduleArrivalsAndRefresh(current: i32, contract: Contract): void {
    //process unprocessed arrivals
    let unprocessed = UnprocessedArrivalIdQueue.load(current.toString());
    if (unprocessed !== null) {

        let compactArrivals = contract.bulkGetCompactArrivalsByIds(unprocessed.arrivalIds);
        let arrivalIds = unprocessed.arrivalIds;

        for (let i = 0; i < unprocessed.arrivalIds.length; i++) {

            let compactArrival = compactArrivals[i];
            let arrivalId = arrivalIds[i];

            let toPlanetDec = compactArrival.toPlanet;
            let toPlanetLocationId = locationDecToLocationId(toPlanetDec);
            let fromPlanetLocationId = locationDecToLocationId(compactArrival.fromPlanet);

            let arrival = new Arrival(arrivalId.toString());
            arrival.arrivalId = arrivalId.toI32();
            // rawArrival.value1 is an address which gets 0x prefixed and 0 padded in toHexString
            arrival.player = compactArrival.fromPlanetOwner.toHexString();
            arrival.fromPlanet = fromPlanetLocationId;
            arrival.toPlanet = toPlanetLocationId;
            arrival.popArriving = compactArrival.popArriving.toI32();
            arrival.silverMoved = compactArrival.silverMoved.toI32();
            arrival.departureTime = compactArrival.departureTime.toI32();
            arrival.arrivalTime = compactArrival.arrivalTime.toI32();
            arrival.receivedAt = current;

            // or mini refresh
            let fromPlanet = Planet.load(fromPlanetLocationId);
            fromPlanet.populationLazy = compactArrival.fromPlanetPopulation.toI32();
            fromPlanet.silverLazy = compactArrival.toPlanetSilver.toI32();
            fromPlanet.owner = compactArrival.fromPlanetOwner.toHexString();

            let toPlanet = Planet.load(toPlanetLocationId);
            // had to make a new planet which refreshed it
            if (toPlanet === null) {
                // todo this is the most costly path and could use
                // contract.bulkGetPlanetsByIds on the off chance several of the
                // planets need to be newed up costing another contract call per loop
                toPlanet = newPlanet(toPlanetDec, contract);
            } else {
                // or mini refresh
                toPlanet.populationLazy = compactArrival.toPlanetPopulation.toI32();
                toPlanet.silverLazy = compactArrival.toPlanetSilver.toI32();
                toPlanet.owner = compactArrival.toPlanetOwner.toHexString();
            }

            let arrivalTime = arrival.arrivalTime;
            // contract applied arrival for us so just mark as done
            if (arrivalTime <= current) {
                arrival.processedAt = current;
            }
            // put the arrival in an array keyed by its arrivalTime to be later processed by handleBlock
            else {

                let pending = PendingArrivalQueue.load(arrivalTime.toString());
                let arrivals: String[] = [];
                if (pending === null) {
                    pending = new PendingArrivalQueue(arrivalTime.toString());
                } else {
                    arrivals = pending.arrivals;
                }
                arrivals.push(arrival.id);
                pending.arrivals = arrivals;
                pending.save();
            }

            toPlanet.save();
            fromPlanet.save();
            arrival.save();
        }
    }
}

function processArrivals(meta: Meta | null, current: i32, contract: Contract): void {
    // process last+1 up to and including current
    for (let i = meta.lastProcessed + 1; i <= current; i++) {
        let bucket = PendingArrivalQueue.load(i.toString());
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
}

// todo can I type these to not be null somehow?
// NOTE REQUIRES planet to have been refreshed before being called
function calculateSilverSpent(planet: Planet | null): i32 {
    let upgradeState: i32[] = [
        planet.rangeUpgrades,
        planet.speedUpgrades,
        planet.defenseUpgrades,
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
        return planet.silverLazy;
    }

    if (planet.silverLazy > planet.silverCap) {
        return planet.silverCap;
    }

    let timeElapsed: f64 = endTimeS - startTimeS;
    let silverGrowth: f64 = planet.silverGrowth;
    let silver: f64 = planet.silverLazy;
    let silverCap: f64 = planet.silverCap;

    return Math.min(
        timeElapsed * silverGrowth + silver,
        silverCap
    ) as i32;
}

function getEnergyAtTime(planet: Planet | null, atTimeS: i32): i32 {
    if (planet.populationLazy === 0) {
        return 0;
    }

    if (!hasOwner(planet)) {
        return planet.populationLazy;
    }

    let population: f64 = planet.populationLazy;
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
    planet.silverLazy = getSilverOverTime(
        planet,
        planet.lastUpdated,
        atTimeS
    );
    planet.populationLazy = getEnergyAtTime(planet, atTimeS);
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

        if (toPlanetDec.populationLazy > Math.floor((shipsMoved * 100) / toPlanetDec.defense) as i32) {
            // attack reduces target planet's garrison but doesn't conquer it
            toPlanetDec.populationLazy -= Math.floor((shipsMoved * 100) / toPlanetDec.defense) as i32;
        } else {
            // conquers planet
            toPlanetDec.owner = arrival.player;
            toPlanetDec.populationLazy = shipsMoved - Math.floor((toPlanetDec.populationLazy * toPlanetDec.defense) / 100) as i32;
        }
    } else {
        // moving between my own planets
        toPlanetDec.populationLazy += shipsMoved;
    }

    // apply silver
    if (toPlanetDec.silverLazy + arrival.silverMoved > toPlanetDec.silverCap) {
        toPlanetDec.silverLazy = toPlanetDec.silverCap;
    } else {
        toPlanetDec.silverLazy += arrival.silverMoved;
    }

    return toPlanetDec;
}

function newPlanet(locationDec: BigInt, contract: Contract): Planet | null {

    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    // todo why
    let locationId = locationDecToLocationId(locationDec);
    let p = new Planet(locationId);
    let planet = refreshPlanetFromContract(p, rawPlanet, planetExtendedInfo);
    planet.silverSpentComputed = 0;
    planet.locationDec = locationDec;
    planet.isPopulationCapBoosted = isPopCapBoost(locationId);
    planet.isPopulationGrowthBoosted = isPopGroBoost(locationId);
    planet.isRangeBoosted = isRangeBoost(locationId);
    planet.isSpeedBoosted = isSpeedBoost(locationId);
    planet.isDefenseBoosted = isDefBoost(locationId);
    return planet;
}

function refreshPlanetFromContract(planet: Planet | null, rawPlanet: Contract__planetsResult, planetExtendedInfo: Contract__planetsExtendedInfoResult): Planet | null {

    // rawPlanet.value0 is an address which gets 0x prefixed and 0 padded in toHexString
    planet.owner = rawPlanet.value0.toHexString();
    planet.isInitialized = planetExtendedInfo.value0;
    planet.createdAt = planetExtendedInfo.value1.toI32();
    planet.lastUpdated = planetExtendedInfo.value2.toI32();
    planet.perlin = planetExtendedInfo.value3.toI32();
    planet.range = rawPlanet.value1.toI32();
    planet.speed = rawPlanet.value2.toI32();
    planet.defense = rawPlanet.value3.toI32();
    planet.populationLazy = rawPlanet.value4.toI32();
    planet.populationCap = rawPlanet.value5.toI32();
    planet.populationGrowth = rawPlanet.value6.toI32();
    planet.silverCap = rawPlanet.value8.toI32();
    planet.silverGrowth = rawPlanet.value9.toI32();
    planet.silverLazy = rawPlanet.value10.toI32();
    planet.planetLevel = rawPlanet.value11.toI32();
    planet.rangeUpgrades = planetExtendedInfo.value5.toI32();
    planet.speedUpgrades = planetExtendedInfo.value6.toI32();
    planet.defenseUpgrades = planetExtendedInfo.value7.toI32();
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.planetResource = toPlanetResource(rawPlanet.value7.toString());
    planet.spaceType = toSpaceType(planetExtendedInfo.value4.toString());
    return planet;
}

function setup(timestamp: i32): Meta | null {

    let meta = Meta.load("0");

    if (meta === null) {
        meta = new Meta("0");
        meta.lastProcessed = timestamp;

        // careful, player addresses need to be 0x prefixed and 0 padded
        let player = new Player("0x0000000000000000000000000000000000000000");
        player.initTimestamp = timestamp;
        player.save();

    }
    return meta;
}


// 0 index count chars
// 000063220027323fdc04a3e25a94dd995345e07bf016e8afcbb94b881b8e8e2e
// 0 index count bytes
// 00 00 63 22 00 27 32 3f dc 04 a3 e2 5a 94 dd 99 53 45 e0 7b f0 16 e8 af cb b9 4b 88 1b 8e 8e 2e

// byte 9: population cap bonus. Population cap is doubled if this value is < 16
// byte 9 is dc, chars 16 and 17, if 16 is 0, then the byte is < 16
function isPopCapBoost(locationId: String): boolean {
    return locationId.charAt(16) === "0";
}

// byte 10: population grow bonus if byte is < 16
function isPopGroBoost(locationId: String): boolean {
    return locationId.charAt(18) === "0";
}

// byte 11: range bonus if byte is < 16
function isRangeBoost(locationId: String): boolean {
    return locationId.charAt(20) === "0";
}

// byte 12: speed bonus if byte is < 16
function isSpeedBoost(locationId: String): boolean {
    return locationId.charAt(22) === "0";
}

// byte 13: defense bonus if byte is < 16
function isDefBoost(locationId: String): boolean {
    return locationId.charAt(24) === "0";
}

function locationDecToLocationId(locationDec: BigInt): String {
    // BigInt does not get 0 padded by toHexString plus gets a 0x prefix...
    let prefixedLocationId = locationDec.toHexString();
    // strip 0x
    let planetid = prefixedLocationId.substring(2, prefixedLocationId.length);
    // pad to 64
    let locationid = planetid.padStart(64, "0")
    return locationid;
}