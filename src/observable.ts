import { Accessor, createSignal } from 'solid-js';

type SubscriberFn<TVal> = (newValue: TVal) => void;

export class Observable<T> implements PromiseLike<T> {
    private _valueStore: T;

    private _subscribers: Set<SubscriberFn<T>> = new Set();

    constructor(value: T) {
        this._valueStore = value;
    }

    then<TResult1 = T, TResult2 = never>(
            onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, 
            _onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): PromiseLike<TResult1 | TResult2> {
        return new Promise<TResult1>(resolve => {
            const unsubscribe = this.subscribe(value => {
                if (typeof onfulfilled === "function") {
                    resolve(onfulfilled(value));
                }
                unsubscribe();
            });
        });
    }

    public get(): T {
        return this._valueStore;
    }

    public set(value: T) {
        if (value === this._valueStore) {
            return;
        }
        this._valueStore = value;
        this._runSubscribers();
    }

    public subscribe(subscriber: SubscriberFn<T>): () => void {
        this._subscribers.add(subscriber);
        return () => this._subscribers.delete(subscriber);
    }

    private _runSubscribers() {
        this._subscribers.forEach(fn => {
            fn(this._valueStore);
        });
    }
}

export function $<T>(observable: Observable<T>): Accessor<T> {
    const [value, setValue] = createSignal<{value: T}>({value: observable.get()});
    observable.subscribe(newval => {
        setValue({value: newval});
    });

    return () => {
        return value().value;
    };
}
