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

  get initTimestamp(): BigInt {
    let value = this.get("initTimestamp");
    return value.toBigInt();
  }

  set initTimestamp(value: BigInt) {
    this.set("initTimestamp", Value.fromBigInt(value));
  }

  get homeWorld(): string {
    let value = this.get("homeWorld");
    return value.toString();
  }

  set homeWorld(value: string) {
    this.set("homeWorld", Value.fromString(value));
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

  get createdAt(): BigInt {
    let value = this.get("createdAt");
    return value.toBigInt();
  }

  set createdAt(value: BigInt) {
    this.set("createdAt", Value.fromBigInt(value));
  }

  get lastUpdated(): BigInt {
    let value = this.get("lastUpdated");
    return value.toBigInt();
  }

  set lastUpdated(value: BigInt) {
    this.set("lastUpdated", Value.fromBigInt(value));
  }

  get perlin(): BigInt {
    let value = this.get("perlin");
    return value.toBigInt();
  }

  set perlin(value: BigInt) {
    this.set("perlin", Value.fromBigInt(value));
  }

  get range(): BigInt {
    let value = this.get("range");
    return value.toBigInt();
  }

  set range(value: BigInt) {
    this.set("range", Value.fromBigInt(value));
  }

  get speed(): BigInt {
    let value = this.get("speed");
    return value.toBigInt();
  }

  set speed(value: BigInt) {
    this.set("speed", Value.fromBigInt(value));
  }

  get defense(): BigInt {
    let value = this.get("defense");
    return value.toBigInt();
  }

  set defense(value: BigInt) {
    this.set("defense", Value.fromBigInt(value));
  }

  get population(): BigInt {
    let value = this.get("population");
    return value.toBigInt();
  }

  set population(value: BigInt) {
    this.set("population", Value.fromBigInt(value));
  }

  get populationCap(): BigInt {
    let value = this.get("populationCap");
    return value.toBigInt();
  }

  set populationCap(value: BigInt) {
    this.set("populationCap", Value.fromBigInt(value));
  }

  get populationGrowth(): BigInt {
    let value = this.get("populationGrowth");
    return value.toBigInt();
  }

  set populationGrowth(value: BigInt) {
    this.set("populationGrowth", Value.fromBigInt(value));
  }

  get silverCap(): BigInt {
    let value = this.get("silverCap");
    return value.toBigInt();
  }

  set silverCap(value: BigInt) {
    this.set("silverCap", Value.fromBigInt(value));
  }

  get silverGrowth(): BigInt {
    let value = this.get("silverGrowth");
    return value.toBigInt();
  }

  set silverGrowth(value: BigInt) {
    this.set("silverGrowth", Value.fromBigInt(value));
  }

  get silver(): BigInt {
    let value = this.get("silver");
    return value.toBigInt();
  }

  set silver(value: BigInt) {
    this.set("silver", Value.fromBigInt(value));
  }

  get planetLevel(): BigInt {
    let value = this.get("planetLevel");
    return value.toBigInt();
  }

  set planetLevel(value: BigInt) {
    this.set("planetLevel", Value.fromBigInt(value));
  }

  get upgradeState0(): BigInt {
    let value = this.get("upgradeState0");
    return value.toBigInt();
  }

  set upgradeState0(value: BigInt) {
    this.set("upgradeState0", Value.fromBigInt(value));
  }

  get upgradeState1(): BigInt {
    let value = this.get("upgradeState1");
    return value.toBigInt();
  }

  set upgradeState1(value: BigInt) {
    this.set("upgradeState1", Value.fromBigInt(value));
  }

  get upgradeState2(): BigInt {
    let value = this.get("upgradeState2");
    return value.toBigInt();
  }

  set upgradeState2(value: BigInt) {
    this.set("upgradeState2", Value.fromBigInt(value));
  }

  get hatLevel(): BigInt {
    let value = this.get("hatLevel");
    return value.toBigInt();
  }

  set hatLevel(value: BigInt) {
    this.set("hatLevel", Value.fromBigInt(value));
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
}

export class ArrivalsAtInterval extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save ArrivalsAtInterval entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save ArrivalsAtInterval entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("ArrivalsAtInterval", id.toString(), this);
  }

  static load(id: string): ArrivalsAtInterval | null {
    return store.get("ArrivalsAtInterval", id) as ArrivalsAtInterval | null;
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

  get lastProcessed(): BigInt {
    let value = this.get("lastProcessed");
    return value.toBigInt();
  }

  set lastProcessed(value: BigInt) {
    this.set("lastProcessed", Value.fromBigInt(value));
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

  get arrivalId(): BigInt {
    let value = this.get("arrivalId");
    return value.toBigInt();
  }

  set arrivalId(value: BigInt) {
    this.set("arrivalId", Value.fromBigInt(value));
  }

  get player(): string {
    let value = this.get("player");
    return value.toString();
  }

  set player(value: string) {
    this.set("player", Value.fromString(value));
  }

  get fromPlanet(): BigInt {
    let value = this.get("fromPlanet");
    return value.toBigInt();
  }

  set fromPlanet(value: BigInt) {
    this.set("fromPlanet", Value.fromBigInt(value));
  }

  get toPlanet(): BigInt {
    let value = this.get("toPlanet");
    return value.toBigInt();
  }

  set toPlanet(value: BigInt) {
    this.set("toPlanet", Value.fromBigInt(value));
  }

  get popArriving(): BigInt {
    let value = this.get("popArriving");
    return value.toBigInt();
  }

  set popArriving(value: BigInt) {
    this.set("popArriving", Value.fromBigInt(value));
  }

  get silverMoved(): BigInt {
    let value = this.get("silverMoved");
    return value.toBigInt();
  }

  set silverMoved(value: BigInt) {
    this.set("silverMoved", Value.fromBigInt(value));
  }

  get departureTime(): BigInt {
    let value = this.get("departureTime");
    return value.toBigInt();
  }

  set departureTime(value: BigInt) {
    this.set("departureTime", Value.fromBigInt(value));
  }

  get arrivalTime(): BigInt {
    let value = this.get("arrivalTime");
    return value.toBigInt();
  }

  set arrivalTime(value: BigInt) {
    this.set("arrivalTime", Value.fromBigInt(value));
  }

  get receivedAt(): BigInt {
    let value = this.get("receivedAt");
    return value.toBigInt();
  }

  set receivedAt(value: BigInt) {
    this.set("receivedAt", Value.fromBigInt(value));
  }

  get processed(): boolean {
    let value = this.get("processed");
    return value.toBoolean();
  }

  set processed(value: boolean) {
    this.set("processed", Value.fromBoolean(value));
  }
}
