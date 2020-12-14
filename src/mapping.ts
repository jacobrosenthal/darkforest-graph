import { Address, ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
} from "../generated/Contract/Contract";
import { Arrival, ArrivalsAtInterval, Player, Planet } from "../generated/schema";

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
    player.initTimestamp = event.block.timestamp;
    player.homeWorld = locationid.toString();
    player.save();

    let planet = newPlanet(contract, locationid, player.id);
    planet.save();
}



export function handleBlock(block: ethereum.Block): void {
    //todo get this from subgraph.yaml or elsewhere somehow?
    let contract = Contract.bind(Address.fromString("0xa8688cCF5E407C1C782CF0c19b3Ab2cE477Fd739"));

    // dummy arrival sadly all just to hold the last timestap we processed _lastProcessed
    let dummy = dummyArrival(block.timestamp);

    // look up last time and 1s incremets that dont exceed current time
    for (let i = dummy._lastProcessed; i < block.timestamp; i = i + BigInt.fromI32(1)) {
        let bucket = ArrivalsAtInterval.load(i.toString());
        if (bucket !== null) {

            let arrivals = bucket.arrivals.map<Arrival | null>(aid => Arrival.load(aid));
            //todo what to sort by if same arrivaltime

            //really no for of??
            for (let i = 0; i < arrivals.length; i++) {

                let a = arrivals[i];
                let planet = Planet.load(a.toPlanet.toString());
                if (planet === null) {
                    planet = newPlanet(contract, a.toPlanet, "0000000000000000000000000000000000000000");
                }

                planet = arrive(planet, a);
                //do we always save it, because even if they didnt own it, interacting with it has changed its numbers?
                planet.save();

                a.processed = true;
                a.save();
            }
        }
    }


    dummy._lastProcessed = block.timestamp;
    dummy.save();
}


export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);
    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);
    let planet = Planet.load(event.params.loc.toString());
    planet.hatLevel = planetExtendedInfo.value8;
    planet.save();
}

export function handleArrivalQueued(event: ArrivalQueued): void {
    let contract = Contract.bind(event.address);

    let rawArrival = contract.planetArrivals(event.params.arrivalId);
    let arrival = new Arrival(event.params.arrivalId.toString());
    arrival.arrivalId = event.params.arrivalId;
    arrival.player = rawArrival.value1.toHexString();
    arrival.fromPlanet = rawArrival.value2;//turn into locationIdFromDecStr?
    arrival.toPlanet = rawArrival.value3;// turn into locationIdFromDecStr??
    arrival.popArriving = rawArrival.value4;// / 1000;
    arrival.silverMoved = rawArrival.value5;// / 1000;
    arrival.departureTime = rawArrival.value6;
    arrival.arrivalTime = rawArrival.value7;
    arrival.receivedAt = event.block.timestamp;
    arrival._lastProcessed = BigInt.fromI32(0);//dummy variable 
    arrival.processed = false;
    arrival.save()

    // todo if arrival time already hapened, just process it here

    // just use the 1 second resolution 
    let bucketTime = arrival.arrivalTime;
    let bucket = ArrivalsAtInterval.load(bucketTime.toString());
    if (bucket === null) {
        bucket = new ArrivalsAtInterval(bucketTime.toString());
        bucket.arrivals = [];
    }
    //i compressed all this to a few lines and it stopped working so.. leave it?
    let arrivals = bucket.arrivals;
    arrivals.push(arrival.id);
    bucket.arrivals = arrivals;
    bucket.save();
}

export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);

    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);
    let planet = Planet.load(event.params.loc.toString());
    planet.lastUpdated = planetExtendedInfo.value2;
    planet.upgradeState0 = planetExtendedInfo.value5;
    planet.upgradeState1 = planetExtendedInfo.value6;
    planet.upgradeState2 = planetExtendedInfo.value7;
    planet.silverSpentComputed = calculateSilverSpent(planet);
    planet.save();
}

//how to remove null
function calculateSilverSpent(planet: Planet | null): i32 {
    let upgradeState: i32[] = [
        planet.upgradeState0.toI32(),
        planet.upgradeState1.toI32(),
        planet.upgradeState2.toI32(),
    ];

    //todo hardcoded?
    let upgradeCosts: i32[] = [20, 40, 60, 80, 100];
    let totalUpgrades = 0;
    for (let i = 0; i < upgradeState.length; i++) {
        totalUpgrades += upgradeState[i];
    }
    let totalUpgradeCostPercent = 0;
    for (let i = 0; i < totalUpgrades; i++) {
        totalUpgradeCostPercent += upgradeCosts[i];
    }

    return (totalUpgradeCostPercent / 100) * planet.silverCap.toI32();
}


function hasOwner(planet: Planet | null): boolean {
    // planet.owner should never be null
    return planet.owner !== "0000000000000000000000000000000000000000";
};


//converted from ms to S
function getSilverOverTime(
    planet: Planet | null,
    startTimeS: i32,
    endTimeS: i32
): i32 {

    if (!hasOwner(planet)) {
        return planet.silver.toI32();
    }

    if (planet.silver > planet.silverCap) {
        return planet.silverCap.toI32();
    }
    let timeElapsed = endTimeS - startTimeS;

    return Math.min(
        timeElapsed * planet.silverGrowth.toI32() + planet.silver.toI32(),
        planet.silverCap.toI32()
    ) as i32;
}

//converted from ms to S
function getEnergyAtTime(planet: Planet | null, atTimeS: i32): i32 {
    if (planet.population === BigInt.fromI32(0)) {
        return 0;
    }

    if (!hasOwner(planet)) {
        return planet.population.toI32();
    }
    let timeElapsed = atTimeS - planet.lastUpdated.toI32();
    let denominator = (Math.exp((-4 * planet.populationGrowth.toI32() * timeElapsed) / planet.populationCap.toI32()) *
        (planet.populationCap.toI32() / planet.population.toI32() - 1) + 1) as i32;
    return planet.populationCap.toI32() / denominator;
}



//converted from ms to S
function updatePlanetToTime(planet: Planet | null, atTimeS: i32): Planet | null {
    //todo hardcoded game endtime 
    // let safeEndS = Math.min(atTimeS, 1609372800) as i32;
    // if (safeEndS < planet.lastUpdated.toI32()) {
    //     // console.error('tried to update planet to a past time');
    //     return planet;
    // }
    planet.silver = BigInt.fromI32(getSilverOverTime(
        planet,
        planet.lastUpdated.toI32(),
        atTimeS
    ));
    planet.population = BigInt.fromI32(getEnergyAtTime(planet, atTimeS));
    planet.lastUpdated = BigInt.fromI32(atTimeS);
    return planet;
}


function arrive(toPlanet: Planet | null, arrival: Arrival | null): Planet | null {

    // update toPlanet energy and silver right before arrival
    toPlanet = updatePlanetToTime(toPlanet, arrival.arrivalTime.toI32());

    // apply energy
    let shipsMoved = arrival.popArriving.toI32();

    if (arrival.player !== toPlanet.owner) {
        // attacking enemy - includes emptyAddress

        if (toPlanet.population.toI32() > Math.floor((shipsMoved * 100) / toPlanet.defense.toI32()) as i32) {
            // attack reduces target planet's garrison but doesn't conquer it
            toPlanet.population -= BigInt.fromI32(Math.floor((shipsMoved * 100) / toPlanet.defense.toI32()) as i32);
        } else {
            // conquers planet
            toPlanet.owner = arrival.player;
            toPlanet.population = BigInt.fromI32(shipsMoved - Math.floor((toPlanet.population.toI32() * toPlanet.defense.toI32()) / 100) as i32);
        }
    } else {
        // moving between my own planets
        toPlanet.population += BigInt.fromI32(shipsMoved);
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
    planet.createdAt = planetExtendedInfo.value1;
    planet.lastUpdated = planetExtendedInfo.value2;
    planet.perlin = planetExtendedInfo.value3;
    planet.range = rawPlanet.value1;
    planet.speed = rawPlanet.value2;
    planet.defense = rawPlanet.value3;
    planet.population = rawPlanet.value4;// / 1000;
    planet.populationCap = rawPlanet.value5;// / 1000;
    planet.populationGrowth = rawPlanet.value6;// / 1000;
    planet.silverCap = rawPlanet.value8;// / 1000;
    planet.silverGrowth = rawPlanet.value9;// / 1000;
    planet.silver = rawPlanet.value10;// / 1000;
    planet.planetLevel = rawPlanet.value11;
    planet.upgradeState0 = planetExtendedInfo.value5;
    planet.upgradeState1 = planetExtendedInfo.value6;
    planet.upgradeState2 = planetExtendedInfo.value7;
    planet.hatLevel = planetExtendedInfo.value8;
    planet.silverSpentComputed = 0;
    planet.planetResource = toPlanetResource(rawPlanet.value7.toString());
    planet.spaceType = toSpaceType(planetExtendedInfo.value4.toString());
    return planet;
}

function dummyArrival(timestamp: BigInt): Arrival | null {

    let dummy = Arrival.load(BigInt.fromI32(i32.MAX_VALUE).toString());
    if (dummy === null) {
        dummy = new Arrival(BigInt.fromI32(i32.MAX_VALUE).toString());
        dummy.arrivalId = BigInt.fromI32(i32.MAX_VALUE);
        dummy.player = BigInt.fromI32(0).toHexString();
        dummy.fromPlanet = BigInt.fromI32(0);
        dummy.toPlanet = BigInt.fromI32(0);
        dummy.popArriving = BigInt.fromI32(0);
        dummy.silverMoved = BigInt.fromI32(0);
        dummy.departureTime = BigInt.fromI32(0);
        dummy.arrivalTime = BigInt.fromI32(0);
        dummy.receivedAt = timestamp;
        dummy.processed = false;
        dummy._lastProcessed = timestamp;
    }
    return dummy;
}