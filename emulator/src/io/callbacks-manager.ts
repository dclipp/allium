import { FunctionScheduler } from '../function-scheduler';

export class CallbacksManager<TArg> {
    public notify(key: number, value: TArg): void {
        this._latest.set(key, value);
        this._scheduler.immediate(() => {
            this._subscriptions.filter(s => s.key === key).forEach(s => {
                s.cb(value);
            })
        });
    }

    public remove(key: number): void {
        const handles = this._subscriptions.filter(s => s.key === key).map(s => s.handle);
        handles.forEach(h => {
            this.unsubscribe(h);
        })
    }

    public subscribe(key: number, cb: (arg: TArg) => void): string {
        const handle = this.generateHandle();
        this._subscriptions.push({
            key: key,
            handle: handle,
            cb: cb
        });

        if (this._latest.has(key)) {
            cb(this._latest.get(key)!);
        }

        return handle;
    }

    public unsubscribe(handle: string): void {
        const index = this._subscriptions.findIndex(s => s.handle === handle);
        if (index > -1) {
            this._subscriptions.splice(index, 1);
        }
    }

    public constructor(scheduler: FunctionScheduler) {
        this._subscriptions = new Array<{
            readonly key: number,
            readonly handle: string,
            readonly cb: (arg: TArg) => void
        }>();
        this._scheduler = scheduler;
        this._latest = new Map<number, TArg>();
    }

    private generateHandle(): string {
        let h = Date.now().toString() + Math.round(Math.random() * 10000).toString();
        while (this._subscriptions.some(s => s.handle === h)) {
            h = Date.now().toString() + Math.round(Math.random() * 10000).toString();
        }
        return h;
    }

    private readonly _latest: Map<number, TArg>;
    private readonly _scheduler: FunctionScheduler;
    private readonly _subscriptions: Array<{
        readonly key: number,
        readonly handle: string,
        readonly cb: (arg: TArg) => void
    }>;
}