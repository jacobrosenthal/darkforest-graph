import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
    Contract__planetsExtendedInfoResult,
    Contract__planetsResult,
    Contract__bulkGetPlanetsByIdsResultRetStruct,
    Contract__bulkGetPlanetsExtendedInfoByIdsResultRetStruct,
    FoundArtifact,
    DepositedArtifact,
    WithdrewArtifact,
    PlanetTransferred
} from "../generated/Contract/Contract";
import { Arrival, ArrivalQueue, Artifact, Meta, Player, Planet, DepartureQueue, Hat, Upgrade } from "../generated/schema";

// NOTE: every handler must have a planet refresh for the planet(s) touched in
// order to keep lastupdated in sync with the contract

// NOTE: the timestamps within are all unix epoch in seconds NOT MILLISECONDS
// like in all the JS code where youll see divided by contractPrecision. As a
// result be very careful with your copy pastes. And TODO, unify the codebases

// Bigint returns to js as a string which is unfortunate for downstream users.
// Also a lot of the Math fn aren't available as BigInt. BigInt only has i32
// conversions which shoould be safe to hold all variables. However due to
// overflows we must upcast everything to f64 during calculations then safely
// back down to i32 at the end avoid overflows.

// As contract is currently written, an energy refresh happens as part of all
// event handlers. Thus it is required to handle all of them and do a full or
// local refresh to maintain state.

function toSpaceType(spaceType: i32): string {
    if (spaceType == 0) {
        return "NEBULA";
    } else if (spaceType == 1) {
        return "SPACE";
    } else {
        return "DEEP_SPACE";
    }
}

function toPlanetResource(planetResource: i32): string {
    if (planetResource == 0) {
        return "NONE";
    } else {
        return "SILVER";
    }
}

function toArtifactType(artifactType: i32): string {
    if (artifactType == 1) {
        return "OBELISK";
    } else if (artifactType == 2) {
        return "COLOSSUS";
    } else if (artifactType == 3) {
        return "SHIPWRECK";
    } else if (artifactType == 4) {
        return "FOSSIL";
    } else {
        return "UNKNOWN";
    }
}

function toArtifactRarity(planetLevel: i32): string {
    if (planetLevel <= 1) {
        return "COMMON";
    } else if (planetLevel <= 3) {
        return "RARE";
    } else if (planetLevel <= 5) {
        return "EPIC";
    } else if (planetLevel <= 7) {
        return "LEGENDARY";
    } else if (planetLevel <= 9) {
        return "MYTHIC";
    } else {
        return "UNKNOWN";
    }
}

function toBiome(biome: i32): string {
    if (biome == 1) {
        return "OCEAN";
    } else if (biome == 2) {
        return "FOREST";
    } else if (biome == 3) {
        return "JUNGLE";
    } else if (biome == 4) {
        return "TUNDRA";
    } else if (biome == 5) {
        return "SWAMP";
    } else if (biome == 6) {
        return "DESERT";
    } else if (biome == 7) {
        return "ICE";
    } else if (biome == 8) {
        return "WASTELAND";
    } else if (biome == 9) {
        return "LAVA";
    } else {
        return "UNKNOWN";
    }
}

export function handleFoundArtifact(event: FoundArtifact): void {
    let contract = Contract.bind(event.address);

    let locationDec = event.params.loc;
    let locationId = locationDecToLocationId(locationDec);

    let rawArtifact = contract.getArtifactById(event.params.artifactId);
    // this has a 0x prefixed now..is that ok?
    let artifact = new Artifact(event.params.artifactId.toHexString());
    artifact.artifactId = event.params.artifactId;
    artifact.planetDiscoveredOn = locationId;
    artifact.planetLevel = rawArtifact.artifact.planetLevel.toI32();
    artifact.rarity = toArtifactRarity(artifact.planetLevel);
    artifact.planetBiome = toBiome(rawArtifact.artifact.planetBiome);
    artifact.mintedAtTimestamp = rawArtifact.artifact.mintedAtTimestamp.toI32();
    // addresses gets 0x prefixed and 0 padded in toHexString
    artifact.discoverer = rawArtifact.artifact.discoverer.toHexString();
    artifact.artifactType = toArtifactType(rawArtifact.artifact.artifactType);

    artifact.energyCapMultiplier = rawArtifact.upgrade.popCapMultiplier.toI32();
    artifact.energyGrowthMultiplier = rawArtifact.upgrade.popGroMultiplier.toI32();
    artifact.rangeMultiplier = rawArtifact.upgrade.rangeMultiplier.toI32();
    artifact.speedMultiplier = rawArtifact.upgrade.speedMultiplier.toI32();
    artifact.defenseMultiplier = rawArtifact.upgrade.defMultiplier.toI32();

    artifact.save();

    // mini refresh
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();
}

export function handleWithdrewArtifact(event: WithdrewArtifact): void {
    let contract = Contract.bind(event.address);

    // mini refresh
    let locationDec = event.params.loc;
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let locationId = locationDecToLocationId(locationDec);
    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();
}

export function handleDepositedArtifact(event: DepositedArtifact): void {
    let contract = Contract.bind(event.address);

    // mini refresh
    let locationDec = event.params.loc;
    let rawPlanet = contract.planets(locationDec);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationDec);

    let locationId = locationDecToLocationId(locationDec);
    let planet = Planet.load(locationId);
    planet = refreshPlanetFromContract(planet, rawPlanet, planetExtendedInfo);
    planet.save();
}


// Note i could mini refresh to save a call, but these get
// called like never
export function handlePlanetTransferred(event: PlanetTransferred): void {
    let contract = Contract.bind(event.address);

    // mini refresh
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
    let contract = Contract.bind(Address.fromString("0x678ACb78948Be7F354B28DaAb79B1ABD81574c1B"));

    let current = block.timestamp.toI32();

    // first call setup and global to hold the last timestap we processed
    let meta = setup(current);

    // schedule any departures from arrival handler and do the delayed mini refresh
    processDepartures(current, contract);

    processArrivals(meta, current, contract);

    meta.lastProcessed = current;
    meta.save();
}

// Sadly I can't use mini refresh to save a call as I need the upgrades from the
// planetExtendedInfo
export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);

    // mini refresh
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
// We delay minirefresh to the blockhandler
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

        // very costly to call getArrival in a loop, so do them all up front
        let compactArrivals = contract.bulkGetCompactArrivalsByIds(arrivalIds);

        // very costly to call getPlanet in a loop, so do them all up front
        var toPlanets = new Map<string, Planet | null>();
        let nullPlanets: BigInt[] = [];

        // find the planets we know about and add them to the map
        for (let i = 0; i < arrivalIds.length; i++) {

            let toPlanetDec = compactArrivals[i].toPlanet;
            let toPlanetLocationId = locationDecToLocationId(toPlanetDec);
            let toPlanet = Planet.load(toPlanetLocationId);
            if (toPlanet === null) {
                nullPlanets.push(toPlanetDec);
            }
            toPlanets.set(toPlanetLocationId, toPlanet);
        }

        // new up the ones we dont know about and add them to the map
        let rawPlanets = contract.bulkGetPlanetsByIds(nullPlanets);
        let rawPlanetExtendeds = contract.bulkGetPlanetsExtendedInfoByIds(nullPlanets);

        for (let i = 0; i < rawPlanets.length; i++) {
            let locationDec = nullPlanets[i];
            let toPlanet = newPlanetFromBulk(locationDec, rawPlanets[i], rawPlanetExtendeds[i]);
            toPlanets.set(toPlanet.id, toPlanet);
        }

        for (let i = 0; i < arrivalIds.length; i++) {

            let compactArrival = compactArrivals[i];
            let arrivalId = arrivalIds[i];
            let arrivalTime = compactArrival.arrivalTime.toI32();

            let toPlanetDec = compactArrival.toPlanet
            let fromPlanetDec = compactArrival.fromPlanet
            let toPlanetLocationId = locationDecToLocationId(toPlanetDec);
            let fromPlanetLocationId = locationDecToLocationId(fromPlanetDec);

            let arrival = new Arrival(arrivalId.toString());
            arrival.arrivalId = arrivalId.toI32();
            // addresses gets 0x prefixed and 0 padded in toHexString
            arrival.player = compactArrival.fromPlanetOwner.toHexString();
            arrival.fromPlanet = fromPlanetLocationId;
            arrival.toPlanet = toPlanetLocationId;
            arrival.milliEnergyArriving = compactArrival.popArriving.toI32();
            arrival.milliSilverMoved = compactArrival.silverMoved.toI32();
            arrival.departureTime = compactArrival.departureTime.toI32();
            arrival.arrivalTime = arrivalTime;
            arrival.receivedAt = current;
            arrival.save();

            // heres our fromplanet mini refresh
            let fromPlanet = Planet.load(fromPlanetLocationId);
            // addresses gets 0x prefixed and 0 padded in toHexString
            fromPlanet.owner = compactArrival.fromPlanetOwner.toHexString();
            fromPlanet.milliEnergyLazy = compactArrival.fromPlanetPopulation.toI32();;
            fromPlanet.milliSilverLazy = compactArrival.fromPlanetSilver.toI32();
            fromPlanet.lastUpdated = current;
            fromPlanet.save();

            // get a mini refresh
            let toPlanet = toPlanets.get(toPlanetLocationId);
            // addresses gets 0x prefixed and 0 padded in toHexString
            toPlanet.owner = compactArrival.toPlanetOwner.toHexString();
            toPlanet.milliEnergyLazy = compactArrival.toPlanetPopulation.toI32();
            toPlanet.milliSilverLazy = compactArrival.toPlanetSilver.toI32();
            toPlanet.lastUpdated = current;
            toPlanet.save();

            // put the arrival in an array keyed by its arrivalTime to be later processed by handleBlock
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
    let upgradeCosts: f64[] = [20, 40, 60, 80, 100];
    let totalUpgrades = 0;
    for (let i = 0; i < upgradeState.length; i++) {
        totalUpgrades += upgradeState[i];
    }
    let totalUpgradeCostPercent: f64 = 0;
    for (let i = 0; i < totalUpgrades; i++) {
        totalUpgradeCostPercent += upgradeCosts[i];
    }

    let silverSpent: f64 = (totalUpgradeCostPercent / 100.0) * f64(planet.milliSilverCap);

    return i32(silverSpent);
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
        return planet.milliSilverLazy;
    }

    if (!hasOwner(planet)) {
        return planet.milliSilverLazy;
    }

    if (planet.milliSilverLazy > planet.milliSilverCap) {
        return planet.milliSilverCap;
    }

    let milliSilver = f64(planet.milliSilverLazy);
    let milliSilverCap = f64(planet.milliSilverCap); // 60000000000 current max
    let milliSilverGrowth = f64(planet.milliSilverGrowth); // 3333000 current max
    let timeElapsed = f64(endTimeS - startTimeS); // this can be arbitrarily large if months passed~2 weeks is 902725

    // timeElapsed * silverGrowth + silver <= i32.MAX_VALUE
    // assert(timeElapsed <= (i32.MAX_VALUE - silver) / silverGrowth);
    if (timeElapsed > (f64(i32.MAX_VALUE) - milliSilver) / milliSilverGrowth) {
        timeElapsed = (f64(i32.MAX_VALUE) - milliSilver) / milliSilverGrowth;
    }

    return i32(Math.min(timeElapsed * milliSilverGrowth + milliSilver, milliSilverCap));
}

function getEnergyAtTime(planet: Planet | null, atTimeS: i32): i32 {

    if (atTimeS <= planet.lastUpdated) {
        return planet.milliEnergyLazy;
    }

    if (!hasOwner(planet)) {
        return planet.milliEnergyLazy;
    }

    if (planet.milliEnergyLazy === 0) {
        return 0;
    }

    let milliEnergy = f64(planet.milliEnergyLazy);
    let milliEnergyCap = f64(planet.milliEnergyCap); // 65000000 current max
    let milliEnergyGrowth = f64(planet.milliEnergyGrowth); // 3000 current max
    let timeElapsed = f64(atTimeS - planet.lastUpdated); // this can be arbitrarily large if months passed ~2 weeks is 902725

    // (-4 * energyGrowth * timeElapsed) / energyCap >= f64.MIN_VALUE
    // assert(timeElapsed <= (f64.MIN_VALUE * energyCap) * -4 * energyGrowth)
    if (timeElapsed > (f64.MIN_VALUE * milliEnergyCap) * -4.0 * milliEnergyGrowth) {
        timeElapsed = (f64.MIN_VALUE * milliEnergyCap) * -4.0 * milliEnergyGrowth;
    }

    // Math.exp between 0 and 1 as long as inside stays negative, so could be as big as energyCap+1
    let denominator: f64 = Math.exp((-4.0 * milliEnergyGrowth * timeElapsed) / milliEnergyCap) *
        (milliEnergyCap / milliEnergy - 1.0) + 1.0;

    //could be as big as energyCap
    return i32(milliEnergyCap / denominator);
}

function updatePlanetToTime(planet: Planet | null, atTimeS: i32): Planet | null {
    planet.milliSilverLazy = getSilverOverTime(
        planet,
        planet.lastUpdated,
        atTimeS
    );
    planet.milliEnergyLazy = getEnergyAtTime(planet, atTimeS);
    planet.lastUpdated = atTimeS;
    return planet;
}

function arrive(toPlanet: Planet | null, arrival: Arrival | null): Planet | null {

    // update toPlanet energy and silver right before arrival
    toPlanet = updatePlanetToTime(toPlanet, arrival.arrivalTime);

    // apply energy
    let shipsMoved = arrival.milliEnergyArriving;

    if (arrival.player !== toPlanet.owner) {
        // attacking enemy - includes emptyAddress

        let abc = i32(Math.trunc(f64(shipsMoved) * 100.0) / f64(toPlanet.defense))
        if (toPlanet.milliEnergyLazy > abc) {
            // attack reduces target planet's garrison but doesn't conquer it
            toPlanet.milliEnergyLazy -= abc;
        } else {
            // conquers planet
            toPlanet.owner = arrival.player;
            toPlanet.milliEnergyLazy = shipsMoved - i32(Math.trunc((f64(toPlanet.milliEnergyLazy) * f64(toPlanet.defense)) / 100.0));
        }
    } else {
        // moving between my own planets
        toPlanet.milliEnergyLazy += shipsMoved;
    }

    // apply silver
    if (toPlanet.milliSilverLazy + arrival.milliSilverMoved > toPlanet.milliSilverCap) {
        toPlanet.milliSilverLazy = toPlanet.milliSilverCap;
    } else {
        toPlanet.milliSilverLazy += arrival.milliSilverMoved;
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
    planet.milliEnergyLazy = rawPlanet.value4.toI32();
    planet.milliEnergyCap = rawPlanet.value5.toI32();
    planet.milliEnergyGrowth = rawPlanet.value6.toI32();
    planet.milliSilverCap = rawPlanet.value8.toI32();
    planet.milliSilverGrowth = rawPlanet.value9.toI32();
    planet.milliSilverLazy = rawPlanet.value10.toI32();
    planet.planetLevel = rawPlanet.value11.toI32();
    planet.rangeUpgrades = planetExtendedInfo.value5.toI32();
    planet.speedUpgrades = planetExtendedInfo.value6.toI32();
    planet.defenseUpgrades = planetExtendedInfo.value7.toI32();
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.planetResource = toPlanetResource(rawPlanet.value7);
    planet.spaceType = toSpaceType(planetExtendedInfo.value4);

    planet.hasTriedFindingArtifact = planetExtendedInfo.value9;
    if (planetExtendedInfo.value10 !== BigInt.fromI32(0)) {
        // 0x prefixed?
        planet.heldArtifact = planetExtendedInfo.value10.toHexString();
        planet.artifactLockedTimestamp = planetExtendedInfo.value11.toI32();
    } else {
        planet.heldArtifact = null;
        planet.artifactLockedTimestamp = null;
    }

    //localstuff
    planet.silverSpentComputed = 0;
    planet.locationDec = locationDec;
    planet.isEnergyCapBoosted = isEnergyCapBoosted(locationId);
    planet.isEnergyGrowthBoosted = isEnergyGrowthBoosted(locationId);
    planet.isRangeBoosted = isRangeBoosted(locationId);
    planet.isSpeedBoosted = isSpeedBoosted(locationId);
    planet.isDefenseBoosted = isDefenseBoosted(locationId);
    planet.isPlanetMineable = isPlanetMineable(planet);
    return planet;
}

function newPlanetFromBulk(locationDec: BigInt, rawPlanet: Contract__bulkGetPlanetsByIdsResultRetStruct, planetExtendedInfo: Contract__bulkGetPlanetsExtendedInfoByIdsResultRetStruct): Planet | null {

    let locationId = locationDecToLocationId(locationDec);

    let planet = new Planet(locationId);
    // addresses gets 0x prefixed and 0 padded in toHexString
    planet.owner = rawPlanet.owner.toHexString();
    planet.isInitialized = planetExtendedInfo.isInitialized;
    planet.createdAt = planetExtendedInfo.createdAt.toI32();
    planet.lastUpdated = planetExtendedInfo.lastUpdated.toI32();
    planet.perlin = planetExtendedInfo.perlin.toI32();
    planet.range = rawPlanet.range.toI32();
    planet.speed = rawPlanet.speed.toI32();
    planet.defense = rawPlanet.defense.toI32();
    planet.milliEnergyLazy = rawPlanet.population.toI32();
    planet.milliEnergyCap = rawPlanet.populationCap.toI32();
    planet.milliEnergyGrowth = rawPlanet.populationGrowth.toI32();
    planet.milliSilverCap = rawPlanet.silverCap.toI32();
    planet.milliSilverGrowth = rawPlanet.silverGrowth.toI32();
    planet.milliSilverLazy = rawPlanet.silver.toI32();
    planet.planetLevel = rawPlanet.planetLevel.toI32();
    planet.rangeUpgrades = planetExtendedInfo.upgradeState0.toI32();
    planet.speedUpgrades = planetExtendedInfo.upgradeState1.toI32();
    planet.defenseUpgrades = planetExtendedInfo.upgradeState2.toI32();

    planet.hatLevel = planetExtendedInfo.hatLevel.toI32();
    planet.planetResource = toPlanetResource(rawPlanet.planetResource);
    planet.spaceType = toSpaceType(planetExtendedInfo.spaceType);

    planet.hasTriedFindingArtifact = planetExtendedInfo.hasTriedFindingArtifact;
    if (planetExtendedInfo.heldArtifactId !== BigInt.fromI32(0)) {
        // 0x prefixed?
        planet.heldArtifact = planetExtendedInfo.heldArtifactId.toHexString();
        planet.artifactLockedTimestamp = planetExtendedInfo.artifactLockedTimestamp.toI32();
    } else {
        planet.heldArtifact = null;
        planet.artifactLockedTimestamp = null;
    }

    //localstuff
    planet.silverSpentComputed = 0;
    planet.locationDec = locationDec;
    planet.isEnergyCapBoosted = isEnergyCapBoosted(locationId);
    planet.isEnergyGrowthBoosted = isEnergyGrowthBoosted(locationId);
    planet.isRangeBoosted = isRangeBoosted(locationId);
    planet.isSpeedBoosted = isSpeedBoosted(locationId);
    planet.isDefenseBoosted = isDefenseBoosted(locationId);
    planet.isPlanetMineable = isPlanetMineable(planet);
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
    planet.milliEnergyLazy = rawPlanet.value4.toI32();
    planet.milliEnergyCap = rawPlanet.value5.toI32();
    planet.milliEnergyGrowth = rawPlanet.value6.toI32();
    planet.milliSilverCap = rawPlanet.value8.toI32();
    planet.milliSilverGrowth = rawPlanet.value9.toI32();
    planet.milliSilverLazy = rawPlanet.value10.toI32();
    planet.planetLevel = rawPlanet.value11.toI32();
    planet.rangeUpgrades = planetExtendedInfo.value5.toI32();
    planet.speedUpgrades = planetExtendedInfo.value6.toI32();
    planet.defenseUpgrades = planetExtendedInfo.value7.toI32();
    planet.hatLevel = planetExtendedInfo.value8.toI32();
    planet.planetResource = toPlanetResource(rawPlanet.value7);
    planet.spaceType = toSpaceType(planetExtendedInfo.value4);

    planet.hasTriedFindingArtifact = planetExtendedInfo.value9;
    if (planetExtendedInfo.value10 !== BigInt.fromI32(0)) {
        // 0x prefixed?
        planet.heldArtifact = planetExtendedInfo.value10.toHexString();
        planet.artifactLockedTimestamp = planetExtendedInfo.value11.toI32();
    } else {
        planet.heldArtifact = null;
        planet.artifactLockedTimestamp = null;
    }

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

// byte 9: energy cap bonus if byte is < 16
function isEnergyCapBoosted(locationId: String): boolean {
    return locationId.charAt(18) === "0";
}

// byte 10: energy grow bonus if byte is < 16
function isEnergyGrowthBoosted(locationId: String): boolean {
    return locationId.charAt(20) === "0";
}

// byte 11: range bonus if byte is < 16
function isRangeBoosted(locationId: String): boolean {
    return locationId.charAt(22) === "0";
}

// byte 12: speed bonus if byte is < 16
function isSpeedBoosted(locationId: String): boolean {
    return locationId.charAt(24) === "0";
}

// byte 13: defense bonus if byte is < 16
function isDefenseBoosted(locationId: String): boolean {
    return locationId.charAt(26) === "0";
}

// byte 14: defense bonus if byte is < 16
function isPlanetMineable(planet: Planet | null): boolean {
    return (
        planet.id.charAt(28) === "0" &&
        planet.planetLevel >= 1 &&
        planet.planetResource !== "SILVER"
    );
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
