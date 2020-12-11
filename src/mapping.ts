import { BigInt } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
} from "../generated/Contract/Contract";
import { Arrival, Player, Planet } from "../generated/schema";

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

    let rawPlanet = contract.planets(locationid);
    let planetExtendedInfo = contract.planetsExtendedInfo(locationid);
    let planet = new Planet(locationid.toString());
    planet.isInitialized = planetExtendedInfo.value0;
    planet.createdAt = planetExtendedInfo.value1;
    planet.lastUpdated = planetExtendedInfo.value2;
    planet.owner = player.id;
    planet.perlin = planetExtendedInfo.value3;
    planet.range = rawPlanet.value1;
    planet.speed = rawPlanet.value2;
    planet.defense = rawPlanet.value3;
    planet.population = rawPlanet.value4;
    planet.populationCap = rawPlanet.value5;
    planet.populationGrowth = rawPlanet.value6;
    planet.silverCap = rawPlanet.value8;
    planet.silverGrowth = rawPlanet.value9;
    planet.silver = rawPlanet.value10;
    planet.planetLevel = rawPlanet.value11;
    planet.upgradeState0 = planetExtendedInfo.value5;
    planet.upgradeState1 = planetExtendedInfo.value6;
    planet.upgradeState2 = planetExtendedInfo.value7;
    planet.hatLevel = planetExtendedInfo.value8;
    planet.planetResource = toPlanetResource(rawPlanet.value7.toString());
    planet.spaceType = toSpaceType(planetExtendedInfo.value4.toString());
    planet.save();
}

export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);
    let planetEntity = Planet.load(event.params.loc.toString());

    if (planetEntity == null) {
        planetEntity = new Planet(event.params.loc.toString());
    }

    let planet = contract.planets(event.params.loc);
    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);

    planetEntity.isInitialized = planetExtendedInfo.value0;
    planetEntity.createdAt = planetExtendedInfo.value1;
    planetEntity.lastUpdated = planetExtendedInfo.value2;
    planetEntity.owner = planet.value0.toHexString();
    planetEntity.perlin = planetExtendedInfo.value3;
    planetEntity.range = planet.value1;
    planetEntity.speed = planet.value2;
    planetEntity.defense = planet.value3;
    planetEntity.population = planet.value4;
    planetEntity.populationCap = planet.value5;
    planetEntity.populationGrowth = planet.value6;
    planetEntity.silverCap = planet.value8;
    planetEntity.silverGrowth = planet.value9;
    planetEntity.silver = planet.value10;
    planetEntity.planetLevel = planet.value11;
    planetEntity.upgradeState0 = planetExtendedInfo.value5;
    planetEntity.upgradeState1 = planetExtendedInfo.value6;
    planetEntity.upgradeState2 = planetExtendedInfo.value7;
    planetEntity.hatLevel = planetExtendedInfo.value8;
    planetEntity.planetResource = toPlanetResource(planet.value7.toString());
    planetEntity.spaceType = toSpaceType(planetExtendedInfo.value4.toString());

    planetEntity.save();
}

export function handleArrivalQueued(event: ArrivalQueued): void {
    let contract = Contract.bind(event.address);

    let rawArrival = contract.planetArrivals(event.params.arrivalId);
    let arrival = new Arrival(event.params.arrivalId.toString());
    arrival.player = rawArrival.value1.toHexString();
    arrival.fromPlanet = rawArrival.value2;
    arrival.toPlanet = rawArrival.value3;
    arrival.popArriving = rawArrival.value4;
    arrival.silverMoved = rawArrival.value5;
    arrival.departureTime = rawArrival.value6;
    arrival.arrivalTime = rawArrival.value7;
    arrival.save()
}

export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);

    let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);
    let planet = Planet.load(event.params.loc.toString());
    if (planet !== null) {
        planet.lastUpdated = planetExtendedInfo.value2;
        planet.upgradeState0 = planetExtendedInfo.value5;
        planet.upgradeState1 = planetExtendedInfo.value6;
        planet.upgradeState2 = planetExtendedInfo.value7;
        planet.save();
    }
}
