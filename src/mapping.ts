import { BigInt } from "@graphprotocol/graph-ts";
import {
    ArrivalQueued,
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    BoughtHat,
} from "../generated/Contract/Contract";
import { Player, Planet } from "../generated/schema";

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
    let playerEntity = Player.load(event.params.player.toHexString());
    let planetEntity = Planet.load(event.params.loc.toString());

    if (planetEntity == null) {
        planetEntity = new Planet(event.params.loc.toString());
    }

    if (playerEntity == null) {
        playerEntity = new Player(event.params.player.toHexString());
        playerEntity.initTimestamp = event.block.timestamp;
        playerEntity.homeWorld = planetEntity.id;
        playerEntity.volume = BigInt.fromI32(0);
    }

    playerEntity.volume += event.transaction.value;
    playerEntity.volume += event.transaction.gasUsed;

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

    playerEntity.save();
    planetEntity.save();
}

export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);
    let playerEntity = Player.load(event.transaction.from.toHexString());
    let planetEntity = Planet.load(event.params.loc.toString());

    playerEntity.volume += event.transaction.value;
    playerEntity.volume += event.transaction.gasUsed;

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

    playerEntity.save();
    planetEntity.save();
}

export function handleArrivalQueued(event: ArrivalQueued): void {
    let contract = Contract.bind(event.address);
    let planetLoc = contract.planetArrivals(event.params.arrivalId).value2;
    let playerEntity = Player.load(event.transaction.from.toHexString());
    let planetEntity = Planet.load(planetLoc.toString());

    playerEntity.volume += event.transaction.value;
    playerEntity.volume += event.transaction.gasUsed;

    if (planetEntity == null) {
        planetEntity = new Planet(planetLoc.toString());
    }

    let planet = contract.planets(planetLoc);
    let planetExtendedInfo = contract.planetsExtendedInfo(planetLoc);

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

    playerEntity.save();
    planetEntity.save();
}

export function handlePlanetUpgraded(event: PlanetUpgraded): void {
    let contract = Contract.bind(event.address);
    let playerEntity = Player.load(event.transaction.from.toHexString());
    let planetEntity = Planet.load(event.params.loc.toString());

    playerEntity.volume += event.transaction.value;
    playerEntity.volume += event.transaction.gasUsed;

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

    playerEntity.save();
    planetEntity.save();
}
