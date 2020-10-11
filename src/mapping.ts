import { BigInt } from "@graphprotocol/graph-ts"
import {
  Contract,
  ArrivalQueued,
  BoughtHat,
  PlanetDelegated,
  PlanetUndelegated,
  PlanetUpgraded,
  PlayerInitialized
} from "../generated/Contract/Contract"
import { ExampleEntity } from "../generated/schema"

export function handleArrivalQueued(event: ArrivalQueued): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.arrivalId = event.params.arrivalId

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.DISABLE_ZK_CHECK(...)
  // - contract.PERLIN_THRESHOLD_1(...)
  // - contract.PERLIN_THRESHOLD_2(...)
  // - contract.PLANET_RARITY(...)
  // - contract.SILVER_RARITY_1(...)
  // - contract.SILVER_RARITY_2(...)
  // - contract.SILVER_RARITY_3(...)
  // - contract.TIME_FACTOR_HUNDREDTHS(...)
  // - contract._locationIdValid(...)
  // - contract.adminAddress(...)
  // - contract.bulkGetPlanetIds(...)
  // - contract.bulkGetPlanets(...)
  // - contract.bulkGetPlanetsExtendedInfo(...)
  // - contract.bulkGetPlayers(...)
  // - contract.cumulativeRarities(...)
  // - contract.getDefaultStats(...)
  // - contract.getNPlanets(...)
  // - contract.getNPlayers(...)
  // - contract.getPlanetArrivals(...)
  // - contract.getPlanetCounts(...)
  // - contract.getPlanetCumulativeRarities(...)
  // - contract.getPlanetLevelThresholds(...)
  // - contract.initializedPlanetCountByLevel(...)
  // - contract.isDelegated(...)
  // - contract.isPlayerInitialized(...)
  // - contract.paused(...)
  // - contract.planetArrivals(...)
  // - contract.planetDefaultStats(...)
  // - contract.planetEvents(...)
  // - contract.planetEventsCount(...)
  // - contract.planetIds(...)
  // - contract.planetLevelThresholds(...)
  // - contract.planets(...)
  // - contract.planetsExtendedInfo(...)
  // - contract.playerIds(...)
  // - contract.upgradePlanet(...)
  // - contract.upgrades(...)
  // - contract.worldRadius(...)
}

export function handleBoughtHat(event: BoughtHat): void {}

export function handlePlanetDelegated(event: PlanetDelegated): void {}

export function handlePlanetUndelegated(event: PlanetUndelegated): void {}

export function handlePlanetUpgraded(event: PlanetUpgraded): void {}

export function handlePlayerInitialized(event: PlayerInitialized): void {}
