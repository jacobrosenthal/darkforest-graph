import { Address } from "@graphprotocol/graph-ts";
import {
    Contract,
    PlanetUpgraded,
    PlayerInitialized,
    RefreshPlanetCall,
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
    let playerEntity = Player.load(event.params.player.toHex());
    let planetEntity = Planet.load(event.params.loc.toString());
    let contract = Contract.bind(event.address);

    if (playerEntity == null) {
        playerEntity = new Player(event.params.player.toHex());

        playerEntity.initTimestamp = event.block.timestamp;
        playerEntity.homeWorld = event.params.loc;
    }

    if (planetEntity == null) {
        planetEntity = new Planet(event.params.loc.toString());

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
        planetEntity.planetResource = toPlanetResource(
            planet.value7.toString()
        );
        planetEntity.spaceType = toSpaceType(
            planetExtendedInfo.value4.toString()
        );
    }

    playerEntity.save();
    planetEntity.save();
}

// export function handleArrivalQueued(event: ArrivalQueued): void {}

// export function handleBoughtHat(event: BoughtHat): void {}

// export function handlePlanetDelegated(event: PlanetDelegated): void {}

// export function handlePlanetUndelegated(event: PlanetUndelegated): void {}

// export function handlePlanetUpgraded(event: PlanetUpgraded): void {
//     let entity = Planet.load(event.params.loc.toString());
//     let contract = Contract.bind(event.address);

//     if (entity == null) {
//         entity = new Planet(event.params.loc.toString());

//         let planet = contract.planets(event.params.loc);
//         let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);

//         entity.isInitialized = planetExtendedInfo.value0;
//         entity.createdAt = planetExtendedInfo.value1;
//         entity.lastUpdated = planetExtendedInfo.value2;
//         entity.owner = planet.value0.toHexString();
//         entity.perlin = planetExtendedInfo.value3;
//         entity.range = planet.value1;
//         entity.speed = planet.value2;
//         entity.defense = planet.value3;
//         entity.population = planet.value4;
//         entity.populationCap = planet.value5;
//         entity.populationGrowth = planet.value6;
//         entity.silverCap = planet.value8;
//         entity.silverGrowth = planet.value9;
//         entity.silver = planet.value10;
//         entity.planetLevel = planet.value11;
//         entity.upgradeState0 = planetExtendedInfo.value5;
//         entity.upgradeState1 = planetExtendedInfo.value6;
//         entity.upgradeState2 = planetExtendedInfo.value7;
//         entity.hatLevel = planetExtendedInfo.value8;
//         entity.planetResource = toPlanetResource(planet.value7.toString());
//         entity.spaceType = toSpaceType(planetExtendedInfo.value4.toString());
//     } else {
//         let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);

//         entity.upgradeState0 = planetExtendedInfo.value5;
//         entity.upgradeState1 = planetExtendedInfo.value6;
//         entity.upgradeState2 = planetExtendedInfo.value7;
//     }

//     entity.save();
// }

export function handleRefreshPlanet(call: RefreshPlanetCall): void {
    let entity = Planet.load(call.inputs._location.toString());
    let contract = Contract.bind(
        Address.fromString(call.transaction.to.toString())
    );

    if (entity == null) {
        entity = new Planet(call.inputs._location.toString());
    }

    let planet = contract.planets(call.inputs._location);
    let planetExtendedInfo = contract.planetsExtendedInfo(
        call.inputs._location
    );

    entity.isInitialized = planetExtendedInfo.value0;
    entity.createdAt = planetExtendedInfo.value1;
    entity.lastUpdated = planetExtendedInfo.value2;
    entity.owner = planet.value0.toHexString();
    entity.perlin = planetExtendedInfo.value3;
    entity.range = planet.value1;
    entity.speed = planet.value2;
    entity.defense = planet.value3;
    entity.population = planet.value4;
    entity.populationCap = planet.value5;
    entity.populationGrowth = planet.value6;
    entity.silverCap = planet.value8;
    entity.silverGrowth = planet.value9;
    entity.silver = planet.value10;
    entity.planetLevel = planet.value11;
    entity.upgradeState0 = planetExtendedInfo.value5;
    entity.upgradeState1 = planetExtendedInfo.value6;
    entity.upgradeState2 = planetExtendedInfo.value7;
    entity.hatLevel = planetExtendedInfo.value8;
    entity.planetResource = toPlanetResource(planet.value7.toString());
    entity.spaceType = toSpaceType(planetExtendedInfo.value4.toString());

    entity.save();
}
