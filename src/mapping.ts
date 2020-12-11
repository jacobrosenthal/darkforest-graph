import { BigInt } from "@graphprotocol/graph-ts";
import {
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
    planet.silverSpentComputed = 0;
    planet.planetResource = toPlanetResource(rawPlanet.value7.toString());
    planet.spaceType = toSpaceType(planetExtendedInfo.value4.toString());
    planet.save();
}

export function handleBoughtHat(event: BoughtHat): void {
    let contract = Contract.bind(event.address);

    let planet = Planet.load(event.params.loc.toString());
    if (planet !== null) {
        let rawPlanet = contract.planets(event.params.loc);
        let planetExtendedInfo = contract.planetsExtendedInfo(event.params.loc);
        planet.hatLevel = planetExtendedInfo.value8;
        planet.save();
    }
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
        planet.silverSpentComputed = calculateSilverSpent(planet);
        planet.save();
    }
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
