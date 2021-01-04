// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Address,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class Player extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Player entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Player entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Player", id.toString(), this);
  }

  static load(id: string): Player | null {
    return store.get("Player", id) as Player | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get initTimestamp(): i32 {
    let value = this.get("initTimestamp");
    return value.toI32();
  }

  set initTimestamp(value: i32) {
    this.set("initTimestamp", Value.fromI32(value));
  }

  get homeWorld(): string | null {
    let value = this.get("homeWorld");
    if (value === null || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set homeWorld(value: string | null) {
    if (value === null) {
      this.unset("homeWorld");
    } else {
      this.set("homeWorld", Value.fromString(value as string));
    }
  }

  get planets(): Array<string> {
    let value = this.get("planets");
    return value.toStringArray();
  }

  set planets(value: Array<string>) {
    this.set("planets", Value.fromStringArray(value));
  }
}

export class Planet extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Planet entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Planet entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Planet", id.toString(), this);
  }

  static load(id: string): Planet | null {
    return store.get("Planet", id) as Planet | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get locationDec(): BigInt {
    let value = this.get("locationDec");
    return value.toBigInt();
  }

  set locationDec(value: BigInt) {
    this.set("locationDec", Value.fromBigInt(value));
  }

  get owner(): string {
    let value = this.get("owner");
    return value.toString();
  }

  set owner(value: string) {
    this.set("owner", Value.fromString(value));
  }

  get isInitialized(): boolean {
    let value = this.get("isInitialized");
    return value.toBoolean();
  }

  set isInitialized(value: boolean) {
    this.set("isInitialized", Value.fromBoolean(value));
  }

  get createdAt(): i32 {
    let value = this.get("createdAt");
    return value.toI32();
  }

  set createdAt(value: i32) {
    this.set("createdAt", Value.fromI32(value));
  }

  get lastUpdated(): i32 {
    let value = this.get("lastUpdated");
    return value.toI32();
  }

  set lastUpdated(value: i32) {
    this.set("lastUpdated", Value.fromI32(value));
  }

  get perlin(): i32 {
    let value = this.get("perlin");
    return value.toI32();
  }

  set perlin(value: i32) {
    this.set("perlin", Value.fromI32(value));
  }

  get range(): i32 {
    let value = this.get("range");
    return value.toI32();
  }

  set range(value: i32) {
    this.set("range", Value.fromI32(value));
  }

  get speed(): i32 {
    let value = this.get("speed");
    return value.toI32();
  }

  set speed(value: i32) {
    this.set("speed", Value.fromI32(value));
  }

  get defense(): i32 {
    let value = this.get("defense");
    return value.toI32();
  }

  set defense(value: i32) {
    this.set("defense", Value.fromI32(value));
  }

  get energyLazy(): i32 {
    let value = this.get("energyLazy");
    return value.toI32();
  }

  set energyLazy(value: i32) {
    this.set("energyLazy", Value.fromI32(value));
  }

  get energyCap(): i32 {
    let value = this.get("energyCap");
    return value.toI32();
  }

  set energyCap(value: i32) {
    this.set("energyCap", Value.fromI32(value));
  }

  get energyGrowth(): i32 {
    let value = this.get("energyGrowth");
    return value.toI32();
  }

  set energyGrowth(value: i32) {
    this.set("energyGrowth", Value.fromI32(value));
  }

  get silverCap(): i32 {
    let value = this.get("silverCap");
    return value.toI32();
  }

  set silverCap(value: i32) {
    this.set("silverCap", Value.fromI32(value));
  }

  get silverGrowth(): i32 {
    let value = this.get("silverGrowth");
    return value.toI32();
  }

  set silverGrowth(value: i32) {
    this.set("silverGrowth", Value.fromI32(value));
  }

  get silverLazy(): i32 {
    let value = this.get("silverLazy");
    return value.toI32();
  }

  set silverLazy(value: i32) {
    this.set("silverLazy", Value.fromI32(value));
  }

  get planetLevel(): i32 {
    let value = this.get("planetLevel");
    return value.toI32();
  }

  set planetLevel(value: i32) {
    this.set("planetLevel", Value.fromI32(value));
  }

  get rangeUpgrades(): i32 {
    let value = this.get("rangeUpgrades");
    return value.toI32();
  }

  set rangeUpgrades(value: i32) {
    this.set("rangeUpgrades", Value.fromI32(value));
  }

  get speedUpgrades(): i32 {
    let value = this.get("speedUpgrades");
    return value.toI32();
  }

  set speedUpgrades(value: i32) {
    this.set("speedUpgrades", Value.fromI32(value));
  }

  get defenseUpgrades(): i32 {
    let value = this.get("defenseUpgrades");
    return value.toI32();
  }

  set defenseUpgrades(value: i32) {
    this.set("defenseUpgrades", Value.fromI32(value));
  }

  get isEnergyCapBoosted(): boolean {
    let value = this.get("isEnergyCapBoosted");
    return value.toBoolean();
  }

  set isEnergyCapBoosted(value: boolean) {
    this.set("isEnergyCapBoosted", Value.fromBoolean(value));
  }

  get isEnergyGrowthBoosted(): boolean {
    let value = this.get("isEnergyGrowthBoosted");
    return value.toBoolean();
  }

  set isEnergyGrowthBoosted(value: boolean) {
    this.set("isEnergyGrowthBoosted", Value.fromBoolean(value));
  }

  get isRangeBoosted(): boolean {
    let value = this.get("isRangeBoosted");
    return value.toBoolean();
  }

  set isRangeBoosted(value: boolean) {
    this.set("isRangeBoosted", Value.fromBoolean(value));
  }

  get isSpeedBoosted(): boolean {
    let value = this.get("isSpeedBoosted");
    return value.toBoolean();
  }

  set isSpeedBoosted(value: boolean) {
    this.set("isSpeedBoosted", Value.fromBoolean(value));
  }

  get isDefenseBoosted(): boolean {
    let value = this.get("isDefenseBoosted");
    return value.toBoolean();
  }

  set isDefenseBoosted(value: boolean) {
    this.set("isDefenseBoosted", Value.fromBoolean(value));
  }

  get hatLevel(): i32 {
    let value = this.get("hatLevel");
    return value.toI32();
  }

  set hatLevel(value: i32) {
    this.set("hatLevel", Value.fromI32(value));
  }

  get planetResource(): string {
    let value = this.get("planetResource");
    return value.toString();
  }

  set planetResource(value: string) {
    this.set("planetResource", Value.fromString(value));
  }

  get spaceType(): string {
    let value = this.get("spaceType");
    return value.toString();
  }

  set spaceType(value: string) {
    this.set("spaceType", Value.fromString(value));
  }

  get silverSpentComputed(): i32 {
    let value = this.get("silverSpentComputed");
    return value.toI32();
  }

  set silverSpentComputed(value: i32) {
    this.set("silverSpentComputed", Value.fromI32(value));
  }

  get hasTriedFindingArtifact(): boolean {
    let value = this.get("hasTriedFindingArtifact");
    return value.toBoolean();
  }

  set hasTriedFindingArtifact(value: boolean) {
    this.set("hasTriedFindingArtifact", Value.fromBoolean(value));
  }

  get heldArtifactId(): i32 {
    let value = this.get("heldArtifactId");
    return value.toI32();
  }

  set heldArtifactId(value: i32) {
    this.set("heldArtifactId", Value.fromI32(value));
  }

  get artifactLockedTimestamp(): i32 {
    let value = this.get("artifactLockedTimestamp");
    return value.toI32();
  }

  set artifactLockedTimestamp(value: i32) {
    this.set("artifactLockedTimestamp", Value.fromI32(value));
  }
}

export class DepartureQueue extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save DepartureQueue entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save DepartureQueue entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("DepartureQueue", id.toString(), this);
  }

  static load(id: string): DepartureQueue | null {
    return store.get("DepartureQueue", id) as DepartureQueue | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get arrivalIds(): Array<BigInt> {
    let value = this.get("arrivalIds");
    return value.toBigIntArray();
  }

  set arrivalIds(value: Array<BigInt>) {
    this.set("arrivalIds", Value.fromBigIntArray(value));
  }
}

export class ArrivalQueue extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save ArrivalQueue entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save ArrivalQueue entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("ArrivalQueue", id.toString(), this);
  }

  static load(id: string): ArrivalQueue | null {
    return store.get("ArrivalQueue", id) as ArrivalQueue | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get arrivals(): Array<string> {
    let value = this.get("arrivals");
    return value.toStringArray();
  }

  set arrivals(value: Array<string>) {
    this.set("arrivals", Value.fromStringArray(value));
  }
}

export class Meta extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Meta entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Meta entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Meta", id.toString(), this);
  }

  static load(id: string): Meta | null {
    return store.get("Meta", id) as Meta | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get lastProcessed(): i32 {
    let value = this.get("lastProcessed");
    return value.toI32();
  }

  set lastProcessed(value: i32) {
    this.set("lastProcessed", Value.fromI32(value));
  }
}

export class Arrival extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Arrival entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Arrival entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Arrival", id.toString(), this);
  }

  static load(id: string): Arrival | null {
    return store.get("Arrival", id) as Arrival | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get arrivalId(): i32 {
    let value = this.get("arrivalId");
    return value.toI32();
  }

  set arrivalId(value: i32) {
    this.set("arrivalId", Value.fromI32(value));
  }

  get player(): string {
    let value = this.get("player");
    return value.toString();
  }

  set player(value: string) {
    this.set("player", Value.fromString(value));
  }

  get fromPlanet(): string {
    let value = this.get("fromPlanet");
    return value.toString();
  }

  set fromPlanet(value: string) {
    this.set("fromPlanet", Value.fromString(value));
  }

  get toPlanet(): string {
    let value = this.get("toPlanet");
    return value.toString();
  }

  set toPlanet(value: string) {
    this.set("toPlanet", Value.fromString(value));
  }

  get energyArriving(): i32 {
    let value = this.get("energyArriving");
    return value.toI32();
  }

  set energyArriving(value: i32) {
    this.set("energyArriving", Value.fromI32(value));
  }

  get silverMoved(): i32 {
    let value = this.get("silverMoved");
    return value.toI32();
  }

  set silverMoved(value: i32) {
    this.set("silverMoved", Value.fromI32(value));
  }

  get departureTime(): i32 {
    let value = this.get("departureTime");
    return value.toI32();
  }

  set departureTime(value: i32) {
    this.set("departureTime", Value.fromI32(value));
  }

  get arrivalTime(): i32 {
    let value = this.get("arrivalTime");
    return value.toI32();
  }

  set arrivalTime(value: i32) {
    this.set("arrivalTime", Value.fromI32(value));
  }

  get receivedAt(): i32 {
    let value = this.get("receivedAt");
    return value.toI32();
  }

  set receivedAt(value: i32) {
    this.set("receivedAt", Value.fromI32(value));
  }

  get processedAt(): i32 {
    let value = this.get("processedAt");
    return value.toI32();
  }

  set processedAt(value: i32) {
    this.set("processedAt", Value.fromI32(value));
  }
}

export class Hat extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Hat entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Hat entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Hat", id.toString(), this);
  }

  static load(id: string): Hat | null {
    return store.get("Hat", id) as Hat | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get planet(): string {
    let value = this.get("planet");
    return value.toString();
  }

  set planet(value: string) {
    this.set("planet", Value.fromString(value));
  }

  get player(): string {
    let value = this.get("player");
    return value.toString();
  }

  set player(value: string) {
    this.set("player", Value.fromString(value));
  }

  get hatLevel(): i32 {
    let value = this.get("hatLevel");
    return value.toI32();
  }

  set hatLevel(value: i32) {
    this.set("hatLevel", Value.fromI32(value));
  }

  get timestamp(): i32 {
    let value = this.get("timestamp");
    return value.toI32();
  }

  set timestamp(value: i32) {
    this.set("timestamp", Value.fromI32(value));
  }
}

export class Upgrade extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Upgrade entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Upgrade entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Upgrade", id.toString(), this);
  }

  static load(id: string): Upgrade | null {
    return store.get("Upgrade", id) as Upgrade | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get planet(): string {
    let value = this.get("planet");
    return value.toString();
  }

  set planet(value: string) {
    this.set("planet", Value.fromString(value));
  }

  get player(): string {
    let value = this.get("player");
    return value.toString();
  }

  set player(value: string) {
    this.set("player", Value.fromString(value));
  }

  get timestamp(): i32 {
    let value = this.get("timestamp");
    return value.toI32();
  }

  set timestamp(value: i32) {
    this.set("timestamp", Value.fromI32(value));
  }
}

export class Artifact extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Artifact entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Artifact entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Artifact", id.toString(), this);
  }

  static load(id: string): Artifact | null {
    return store.get("Artifact", id) as Artifact | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get artifactId(): i32 {
    let value = this.get("artifactId");
    return value.toI32();
  }

  set artifactId(value: i32) {
    this.set("artifactId", Value.fromI32(value));
  }

  get planetDiscoveredOn(): i32 {
    let value = this.get("planetDiscoveredOn");
    return value.toI32();
  }

  set planetDiscoveredOn(value: i32) {
    this.set("planetDiscoveredOn", Value.fromI32(value));
  }

  get planetLevel(): i32 {
    let value = this.get("planetLevel");
    return value.toI32();
  }

  set planetLevel(value: i32) {
    this.set("planetLevel", Value.fromI32(value));
  }

  get planetBiome(): string {
    let value = this.get("planetBiome");
    return value.toString();
  }

  set planetBiome(value: string) {
    this.set("planetBiome", Value.fromString(value));
  }

  get mintedAtTimestamp(): i32 {
    let value = this.get("mintedAtTimestamp");
    return value.toI32();
  }

  set mintedAtTimestamp(value: i32) {
    this.set("mintedAtTimestamp", Value.fromI32(value));
  }

  get discoverer(): string {
    let value = this.get("discoverer");
    return value.toString();
  }

  set discoverer(value: string) {
    this.set("discoverer", Value.fromString(value));
  }

  get artifactType(): string {
    let value = this.get("artifactType");
    return value.toString();
  }

  set artifactType(value: string) {
    this.set("artifactType", Value.fromString(value));
  }
}
