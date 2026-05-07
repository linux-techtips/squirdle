export type Clock = {
  seconds(): number,
  day(): number,
}

export interface ClockInterface {
  interface(): Clock
};

export class Now implements ClockInterface {
  static init(): Now {
    return new Now();
  }

  interface(): Clock {
    return {
      seconds: () => millis_to_seconds(Date.now()),
      day: () => millis_to_day(Date.now()),
    };
  }
}

export class Day implements ClockInterface {
  private constructor(private current: number) { }

  static init(millis: number = Date.now()) {
    return new Day(millis_to_day(millis));
  }

  advance(count: number = 1): void {
    this.current += 86_400 * count;
  }

  set(millis: number): void {
    this.current = millis_to_day(millis);
  }

  interface(): Clock {
    return {
      seconds: () => this.current,
      day: () => this.current,
    }
  }
}

function millis_to_seconds(millis: number): number {
  return Math.floor(millis / 1_000);
}
function millis_to_day(millis: number): number {
  return Math.floor(millis / 86_400_000) * 86_400;
}
