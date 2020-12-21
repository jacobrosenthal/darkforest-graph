import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
    Contract__planetsExtendedInfoResult,
    Contract__planetsResult,
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

export function handlePlayerInitialized(event: PlayerInitialized): void {
    let contract = Contract.bind(event.address);
    let locationDec = event.params.loc;

    // addresses gets 0x prefixed and 0 padded in toHexString
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

// Sadly I can't use mini refresh to save a call as I need the upgrades from the
// planetExtendedInfo
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

// Sadly I can't use mini refresh to save a call as I need the upgrades from the
// planetExtendedInfo
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
        for (let i = 0; i < arrivalIds.length; i++) {

            let arrivalId = arrivalIds[i];

            let rawArrival = contract.planetArrivals(arrivalId);

            let toPlanetDec = rawArrival.value3
            let fromPlanetDec = rawArrival.value2
            let toPlanetLocationId = locationDecToLocationId(toPlanetDec);
            let fromPlanetLocationId = locationDecToLocationId(fromPlanetDec);

            let arrival = new Arrival(arrivalId.toString());
            arrival.arrivalId = arrivalId.toI32();
            // addresses gets 0x prefixed and 0 padded in toHexString
            arrival.player = rawArrival.value1.toHexString();
            arrival.fromPlanet = fromPlanetLocationId;
            arrival.toPlanet = toPlanetLocationId;
            arrival.popArriving = rawArrival.value4.toI32();
            arrival.silverMoved = rawArrival.value5.toI32();
            arrival.departureTime = rawArrival.value6.toI32();
            arrival.arrivalTime = rawArrival.value7.toI32();
            arrival.receivedAt = current;
            // careful, we havent saved them to the store yet

            // heres our fromplanet mini refresh
            let rawFromPlanet = contract.planets(fromPlanetDec);
            let fromPlanet = Planet.load(fromPlanetLocationId);
            // addresses gets 0x prefixed and 0 padded in toHexString
            fromPlanet.owner = rawFromPlanet.value0.toHexString();
            fromPlanet.populationLazy = rawFromPlanet.value4.toI32();
            fromPlanet.silverLazy = rawFromPlanet.value10.toI32();
            fromPlanet.lastUpdated = current;
            fromPlanet.save();

            let toPlanet = Planet.load(toPlanetLocationId);
            // had to make a new planet which refreshed it
            if (toPlanet === null) {
                // todo this is the most costly path as its called in a loop.
                // also happens constantly in the game..
                // ideally detect and use contract.bulkGetPlanetsByIds
                toPlanet = newPlanet(toPlanetDec, contract)
            } else {

                let rawToPlanet = contract.planets(toPlanetDec);

                // or get a mini refresh
                // addresses gets 0x prefixed and 0 padded in toHexString
                toPlanet.owner = rawToPlanet.value0.toHexString();
                toPlanet.populationLazy = rawToPlanet.value4.toI32();
                toPlanet.silverLazy = rawToPlanet.value10.toI32();
                toPlanet.lastUpdated = current;
            }
            toPlanet.save();

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

            arrival.save();
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

    if (endTimeS <= startTimeS) {
        return planet.silverLazy;
    }

    if (!hasOwner(planet)) {
        return planet.silverLazy;
    }

    if (planet.silverLazy > planet.silverCap) {
        return planet.silverCap;
    }

    let silver = f64(planet.silverLazy);
    let silverCap = f64(planet.silverCap); // 60000000 current max
    let silverGrowth = f64(planet.silverGrowth); // 3333 current max
    let timeElapsed = f64(endTimeS - startTimeS); // this can be arbitrarily large if months passed~2 weeks is 902725

    // timeElapsed * silverGrowth + silver <= i32.MAX_VALUE
    // assert(timeElapsed <= (i32.MAX_VALUE - silver) / silverGrowth);
    if (timeElapsed > (i32.MAX_VALUE - silver) / silverGrowth) {
        timeElapsed = (i32.MAX_VALUE - silver) / silverGrowth;
    }

    return i32(Math.min(timeElapsed * silverGrowth + silver, silverCap));
}

function getEnergyAtTime(planet: Planet | null, atTimeS: i32): i32 {

    if (atTimeS <= planet.lastUpdated) {
        return planet.populationLazy;
    }

    if (!hasOwner(planet)) {
        return planet.populationLazy;
    }

    if (planet.populationLazy === 0) {
        return 0;
    }

    let population = f64(planet.populationLazy);
    let populationCap = f64(planet.populationCap); // 65000000 current max
    let populationGrowth = f64(planet.populationGrowth); // 3000 current max
    let timeElapsed = f64(atTimeS - planet.lastUpdated); // this can be arbitrarily large if months passed ~2 weeks is 902725

    // (-4 * populationGrowth * timeElapsed) / populationCap >= f64.MIN_VALUE
    // assert(timeElapsed <= (f64.MIN_VALUE * populationCap) * -4 * populationGrowth)
    if (timeElapsed > (f64.MIN_VALUE * populationCap) * -4 * populationGrowth) {
        timeElapsed = (f64.MIN_VALUE * populationCap) * -4 * populationGrowth;
    }

    // Math.exp between 0 and 1 as long as inside stays negative, so could be as big as populationCap+1
    let denominator = Math.exp((-4 * populationGrowth * timeElapsed) / populationCap) *
        (populationCap / population - 1) + 1;

    //could be as big as populationCap
    return i32(populationCap / denominator);
}

function updatePlanetToTime(planet: Planet | null, atTimeS: i32): Planet | null {
    planet.silverLazy = getSilverOverTime(
        planet,
        planet.lastUpdated,
        atTimeS
    );
    planet.populationLazy = getEnergyAtTime(planet, atTimeS);
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

        if (toPlanet.populationLazy > Math.floor((shipsMoved * 100) / toPlanet.defense) as i32) {
            // attack reduces target planet's garrison but doesn't conquer it
            toPlanet.populationLazy -= Math.floor((shipsMoved * 100) / toPlanet.defense) as i32;
        } else {
            // conquers planet
            toPlanet.owner = arrival.player;
            toPlanet.populationLazy = shipsMoved - Math.floor((toPlanet.populationLazy * toPlanet.defense) / 100) as i32;
        }
    } else {
        // moving between my own planets
        toPlanet.populationLazy += shipsMoved;
    }

    // apply silver
    if (toPlanet.silverLazy + arrival.silverMoved > toPlanet.silverCap) {
        toPlanet.silverLazy = toPlanet.silverCap;
    } else {
        toPlanet.silverLazy += arrival.silverMoved;
    }

    return toPlanet;
}

function newPlanet(locationDec: BigInt, contract: Contract): Planet | null {

    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);
    let locationId = locationDecToLocationId(locationDec);

    let planet = new Planet(locationId);

    // addresses gets 0x prefixed and 0 padded in toHexString
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

function refreshPlanetFromContract(planet: Planet | null, rawPlanet: Contract__planetsResult, planetExtendedInfo: Contract__planetsExtendedInfoResult): Planet | null {

    // addresses gets 0x prefixed and 0 padded in toHexString
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