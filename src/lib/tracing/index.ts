import type { FileSink } from "bun";
import * as path from "path";

export const LEVEL = {
  TRACE: 0b00001,
  DEBUG: 0b00010,
  INFO: 0b00100,
  WARN: 0b01000,
  ERROR: 0b10000,
} as const;

export type Subscriber = (level: Level, event: Event) => void;
export type Formatter = (level: Level, event: Event) => string;
export type Filter = (level: Level) => boolean;

export type Source = { file: string, func: string, line: number };
export type Capture = (skip?: Function) => Source | undefined;

export type Level = typeof LEVEL[keyof typeof LEVEL];
export type Event = { message: string, date: Date, source?: Source };

export type Pub = (level: Level, message: string, capture: Capture) => void;
export type Sub = (subscriber: Subscriber) => () => void;
export type Tracer = readonly [pub: Pub, sub: Sub];

export function tracer(): Tracer {
  const subscribers = new Set<((level: Level, event: Event) => void)>();

  function sub(subscriber: (level: Level, event: Event) => void): () => void {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  function pub(level: Level, message: string, capture: Capture = default_capture) {
    const event: Event = { message, date: new Date(), source: capture(pub) };
    for (const subscriber of subscribers) subscriber(level, event);
  }

  return [pub, sub] as const;
}

const PUB = 0 as const;
const SUB = 1 as const;

export function subscribe(tracer: Tracer, subscriber: (level: Level, event: Event) => void): () => void {
  return tracer[SUB](subscriber);
}

export function trace(tracer: Tracer, message: string, capture: Capture = default_capture): void {
  return tracer[PUB](LEVEL.TRACE, message, capture);
}

export function debug(tracer: Tracer, message: string, capture: Capture = default_capture): void {
  return tracer[PUB](LEVEL.DEBUG, message, capture);
}

export function info(tracer: Tracer, message: string, capture: Capture = default_capture): void {
  return tracer[PUB](LEVEL.INFO, message, capture);
}

export function warn(tracer: Tracer, message: string, capture: Capture = default_capture): void {
  return tracer[PUB](LEVEL.WARN, message, capture);
}

export function error(tracer: Tracer, message: string, capture: Capture = default_capture): void {
  return tracer[PUB](LEVEL.ERROR, message, capture);
}

export interface TracerInterface {
  interface(): Subscriber,
};

export class Console implements TracerInterface {
  constructor(private filter: Filter, private formatter: Formatter) { }

  static init(filter: Filter = All, formatter: Formatter = Log) {
    return new Console(filter, formatter);
  }

  interface(): Subscriber {
    return (level, event) => {
      if (this.filter(level)) console.log(this.formatter(level, event));
    };
  }
};

export class File implements TracerInterface {
  constructor(private sink: FileSink, private filter: Filter, private formatter: Formatter) { }

  static init(sink: FileSink, filter: Filter = All, formatter: Formatter = Log) {
    return new File(sink, filter, formatter);
  }

  static stdout(filter: Filter = All, formatter: Formatter = Log) {
    return new File(Bun.stdout.writer(), filter, formatter);
  }

  static stderr(filter: Filter = All, formatter: Formatter = Log) {
    return new File(Bun.stderr.writer(), filter, formatter);
  }

  flush() {
    this.sink.flush();
  }

  interface(): Subscriber {
    return (level, event) => {
      if (this.filter(level)) this.sink.write(this.formatter(level, event) + "\n");
    };
  }
};


const ALL = 0b11111 as const;

export function All(level: Level): boolean {
  return Boolean(level & ALL);
}

export function Log(level: Level, event: Event): string {
  return `[${format_level(level)}] ${format_source(event.source)} "${event.message}" ${format_date(event.date)}`;
}

export function Json(level: Level, event: Event) {
  return JSON.stringify({
    level: format_level(level),
    message: event.message,
    date: format_date(event.date),
    source: event.source,
  })
}

const LEVEL_TEXT = ["trace", "debug", "info", "warn", "error"] as const;

function format_level(level: Level): string {
  return LEVEL_TEXT[31 - Math.clz32(level)]!;
}

function format_source(source?: Source): string {
  return (source) ? `${path.relative(process.cwd(), source.file)}:${source.func}:${source.line}` : "";
}

function format_date(date: Date): string {
  return date.toISOString();
}

function default_capture(skip?: Function): Source | undefined {
  const into: { stack?: string } = {};
  Error.captureStackTrace(into, skip);

  return parse_trace(into.stack ?? "");
}

const FRAME_RE = /^\s*at (?:(.+?) \()?(.+?):(\d+)(?::\d+)?\)?$/;

export function parse_trace(trace: string): Source | undefined {
  for (const raw of trace.split("\n")) {
    const m = raw.match(FRAME_RE);
    if (!m) continue;
    const [, func, file, line] = m;
    return {
      func: func ?? "<anonymous>",
      file: file!,
      line: parseInt(line!, 10),
    };
  }
  return undefined;
}
