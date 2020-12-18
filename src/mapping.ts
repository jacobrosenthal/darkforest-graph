import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
    Contract__bulkGetPlanetsByIdsResultRetStruct,
    Contract__planetsExtendedInfoResult,
    Contract__planetsResult,
    PlanetDelegated
} from "../generated/Contract/Contract";
import { Arrival, ArrivalQueue, Meta, Player, Planet, DepartureQueue, Hat, Upgrade } from "../generated/schema";

// NOTE: the timestamps within are all unix epoch in seconds NOT MILLISECONDS
// like in all the JS code where youll see divided by contractPrecision. As a
// result be very careful with your copy pastes. And TODO, unify the codebases

// A lot of the Math fn aren't available as BigInt so we get out of BigInt from
// the contract asap where possible. However due to overflows we cast variables
// to f64 during calculations then back to i32 at the end avoid overflows.

// As contract is currently written, an energy refresh happens as part of all
// event handlers. Thus it is required to handle all of them and do a full or
// local refresh to maintain state.

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

// Note i could miniRefreshPlanetFromContract to save a call, but these get
// called like never
export function handlePlanetDelegated(event: PlanetDelegated): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let locationId = locationDecToLocationId(locationDec);
    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();
}

// Note i could miniRefreshPlanetFromContract to save a call, but these get
// called like never
export function handlePlanetUnDelegated(event: PlanetDelegated): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let locationId = locationDecToLocationId(locationDec);
    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();
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

    processDepartures(current, contract);

    meta.lastProcessed = current;
    meta.save();
}

// Sadly I can't use miniRefreshPlanetFromContract to save a call as I need the
// upgrdes from the planetExtendedInfo
export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);
    let rawPlanet = contract.planets(locationDec);
    let locationId = locationDecToLocationId(locationDec);
    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();

    let hat = new Hat(locationId)
    hat.player = planet.owner;
    hat.planet = planet.id;
    hat.hatLevel = planet.hatLevel;
    hat.timestamp = planet.lastUpdated;
    hat.save();
}

// A departure (or ArrivalQueued) event. We add these arrivalIds to a
// DepartureQueue for later processing in handleBlock
export function handleArrivalQueued(event: ArrivalQueued): void {

    let current = event.block.timestamp;
    let arrivalIds: BigInt[] = [];
    let departures = DepartureQueue.load(current.toString());
    if (departures === null) {
        departures = new DepartureQueue(current.toString());
    } else {
        arrivalIds = departures.arrivalIds;
    }
    arrivalIds.push(event.params.arrivalId);
    departures.arrivalIds = arrivalIds;
    departures.save();
}

// Sadly I can't use miniRefreshPlanetFromContract to save a call as I need the
// upgrdes from the planetExtendedInfo
export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);
    let rawPlanet = contract.planets(locationDec);
    let locationId = locationDecToLocationId(locationDec);
    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    // recalculate silver spent as thats our field to track
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


function processDepartures(current: i32, contract: Contract): void {

    let departures = DepartureQueue.load(current.toString());
    if (departures !== null) {

        let arrivalIds = departures.arrivalIds;
        let toFromPlanetIdPairs: BigInt[] = [];
        let arrivals: Arrival[] = [];

        for (let i = 0; i < arrivalIds.length; i++) {

            let arrivalId = arrivalIds[i];

            let rawArrival = contract.planetArrivals(arrivalId);

            let toPlanetLocationId = locationDecToLocationId(rawArrival.value3);
            let fromPlanetLocationId = locationDecToLocationId(rawArrival.value2);
            toFromPlanetIdPairs.push(rawArrival.value3);
            toFromPlanetIdPairs.push(rawArrival.value2);

            let arrival = new Arrival(arrivalId.toString());
            arrival.arrivalId = arrivalId.toI32();
            // rawArrival.value1 is an address which gets 0x prefixed and 0 padded in toHexString
            arrival.player = rawArrival.value1.toHexString();
            arrival.fromPlanet = fromPlanetLocationId;
            arrival.toPlanet = toPlanetLocationId;
            arrival.popArriving = rawArrival.value4.toI32();
            arrival.silverMoved = rawArrival.value5.toI32();
            arrival.departureTime = rawArrival.value6.toI32();
            arrival.arrivalTime = rawArrival.value7.toI32();
            arrival.receivedAt = current;
            arrivals.push(arrival);
            //careful, we havent saved them to the store yet
        }

        let toFromRawPlanets = contract.bulkGetPlanetsByIds(toFromPlanetIdPairs);

        for (let i = 0; i < arrivals.length; i++) {

            let arrival = arrivals[i];
            let rawToPlanet = toFromRawPlanets[i];

            let toPlanet = Planet.load(arrival.toPlanet);
            let madeToPlanet = false;
            // had to make a new planet which refreshed it
            if (toPlanet === null) {
                // todo ideally this makes its way into bulk somehow
                let toPlanetLocationDec = BigInt.fromI32(parseInt(arrival.toPlanet) as i32);
                let planetExtendedInfo = contract.planetsExtendedInfo(toPlanetLocationDec);
                toPlanet = newPlanetFromRaw(toPlanetLocationDec, rawToPlanet, planetExtendedInfo)
            } else {
                toPlanet = miniRefreshPlanetFromContract(toPlanet, rawToPlanet, current);
            }

            let arrivalTime = arrival.arrivalTime;
            // contract applied arrival for us?
            if (arrivalTime <= current) {
                arrival.processedAt = current;
            }
            // put the arrival in an array keyed by its arrivalTime to be later processed by handleBlock
            else {
                let pending = ArrivalQueue.load(arrivalTime.toString());
                let pendingArrivals: String[] = [];
                if (pending === null) {
                    pending = new ArrivalQueue(arrivalTime.toString());
                } else {
                    pendingArrivals = pending.arrivals;
                }
                pendingArrivals.push(arrival.id);
                pending.arrivals = pendingArrivals;
                pending.save();
            }

            let rawFromPlanet = toFromRawPlanets[i + 1];
            let fromPlanet = Planet.load(arrival.fromPlanet);
            fromPlanet = miniRefreshPlanetFromContract(fromPlanet, rawFromPlanet, current)

            toPlanet.save();
            fromPlanet.save()
            arrival.save()
        }
    }
}

function processArrivals(meta: Meta | null, current: i32, contract: Contract): void {
    // process last+1 up to and including current
    for (let i = meta.lastProcessed + 1; i <= current; i++) {
        let bucket = ArrivalQueue.load(i.toString());
        if (bucket !== null) {

            // multiple arrivals are in order of arrivalid
            let arrivals = bucket.arrivals.map<Arrival | null>(aid => Arrival.load(aid));

            for (let i = 0; i < arrivals.length; i++) {

                let a = arrivals[i];

                let toPlanet = Planet.load(a.toPlanet);
                toPlanet = arrive(toPlanet, a);
                toPlanet.save();

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
    let locationId = locationDecToLocationId(locationDec);

    let planet = new Planet(locationId);

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

    //localstuff
    planet.silverSpentComputed = 0;
    planet.locationDec = locationDec;
    planet.isPopulationCapBoosted = isPopCapBoost(locationId);
    planet.isPopulationGrowthBoosted = isPopGroBoost(locationId);
    planet.isRangeBoosted = isRangeBoost(locationId);
    planet.isSpeedBoosted = isSpeedBoost(locationId);
    planet.isDefenseBoosted = isDefBoost(locationId);
    return planet;
}


function newPlanetFromRaw(locationDec: BigInt, rawPlanet: Contract__bulkGetPlanetsByIdsResultRetStruct, planetExtendedInfo: Contract__planetsExtendedInfoResult): Planet | null {

    let locationId = locationDecToLocationId(locationDec);

    let planet = new Planet(locationId);
    // rawPlanet.value0 is an address which gets 0x prefixed and 0 padded in toHexString
    planet.owner = rawPlanet.owner.toHexString();
    planet.isInitialized = planetExtendedInfo.value0;
    planet.createdAt = planetExtendedInfo.value1.toI32();
    planet.lastUpdated = planetExtendedInfo.value2.toI32();
    planet.perlin = planetExtendedInfo.value3.toI32();
    planet.range = rawPlanet.range.toI32();
    planet.speed = rawPlanet.speed.toI32();
    planet.defense = rawPlanet.defense.toI32();
    planet.populationLazy = rawPlanet.population.toI32();
    planet.populationCap = rawPlanet.populationCap.toI32();
    planet.populationGrowth = rawPlanet.populationGrowth.toI32();
    planet.silverCap = rawPlanet.silverCap.toI32();
    planet.silverGrowth = rawPlanet.silverGrowth.toI32();
    planet.silverLazy = rawPlanet.silver.toI32();
    planet.planetLevel = rawPlanet.planetLevel.toI32();
    planet.rangeUpgrades = planetExtendedInfo.value5.toI32();
    planet.speedUpgrades = planetExtendedInfo.value6.toI32();
    planet.defenseUpgrades = planetExtendedInfo.value7.toI32();
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.planetResource = toPlanetResource(BigInt.fromI32(rawPlanet.planetResource).toString());
    planet.spaceType = toSpaceType(planetExtendedInfo.value4.toString());

    //localstuff
    planet.silverSpentComputed = 0;
    planet.locationDec = locationDec;
    planet.isPopulationCapBoosted = isPopCapBoost(locationId);
    planet.isPopulationGrowthBoosted = isPopGroBoost(locationId);
    planet.isRangeBoosted = isRangeBoost(locationId);
    planet.isSpeedBoosted = isSpeedBoost(locationId);
    planet.isDefenseBoosted = isDefBoost(locationId);
    return planet;
}

// saves a call to planetExtendedInfo for cases when we KNOW the contract did an
// energy refresh. Thus we can use the planets energy numbers, and use current
// as planetExtendedInfo.lastUpdated
function miniRefreshPlanetFromContract(planet: Planet | null, rawPlanet: Contract__bulkGetPlanetsByIdsResultRetStruct, current: i32): Planet | null {

    // rawPlanet.value0 is an address which gets 0x prefixed and 0 padded in toHexString
    planet.owner = rawPlanet.owner.toHexString();
    planet.populationLazy = rawPlanet.population.toI32();
    planet.silverLazy = rawPlanet.silver.toI32();
    planet.lastUpdated = current;

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
    let locationId = planetid.padStart(64, "0")
    return locationId;
}