# Quipt

This is Quipt. An app for learning theater scripts more online than offline.
It is stable, and not on version control (as I'm still to lazy for that).

The entire App was developed using Solid.js and as such currently relies heavily
on the web platfrom, despite it beeing thought of as an app. It was originally
meant as PWA, but as, after experimenting arround with it, PWA is still rather
non-statble and sometimes unpredictable, the architecture now is a hurdle.

There are two ways to work arround the issues:
    - Solution 1: Deploy as a native app, packaging a browser with it. Just like
    electron, but for android.
        + Simpler in execution
        + Web core can stay
        - Doesn't address more serious problems
    - Solution 2: Deploy as a native app, writing a custom UI & rendering egine and
    JS accessiblity framework on top of it
        - A ton of work
        ? At least App-Logic can mostly remain in place
        + Controlling entire codebase allows for very fine control (over bugs and problems)
        - Solidjs compiler needs to be rewritten for native platform (probably in rust)
        + Solidjs native on the phone (for android at least)

## Information about Solid.js for going fully native

Solidjs manages state mostly via a Signaling & Effects protocol implement fully at
`https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts`
Qick code demo:
```js

createRoot(() => {
    const [data, setData] = createSignal(0);
    setInterval(() => setData(x => x + 1), 1000);
    // setData(..) is associated with a Signal object wich contains
    // a list of callbacks, that are called, whenever setData(..) is called

    createEffect(() => console.log(data()));
    // createEffect(..) creates a Compuation and updates it afterwards (initalizing it).
    // The computation contains the effect hook
    // When a computation is upated, the global Listener is (temporarily) assigned to the computation

    // Whenever the data(..) callback is called (really the readSignal function bound to the Signal object),
    // it checks wether the global Listener object is set, if it is it adds the listeners callbacks to the signal
    // ones.

    // The connection between both components is made: After the Computation was updated for the first time,
    // also the setData(..) callback now knows the effect hook as one of its callbacks, calling it whenever the data is updated.

    // In an overly complex manner we just achived logging a number to the console every second.
})

```

The second important componet is dom-expressions at `https://github.com/ryansolid/dom-expressions`
It is most basically only the library providing a bit nicer API on how to interact with the DOM.
(With functions like `insert()` and `setAttribute`). Important of note is that dom-expressions does
interface with the Signaling & Effects system in Solid.js described previously. It does that via
a shadow import disguised as "rxcore", which should be replaced by babel.
-> For the port: This system needs to be completely replaced, it won't be of use.

At `https://github.com/ryansolid/dom-expressions/tree/main/packages/babel-plugin-jsx-dom-expressions`
THE Solid.js compiler is located. It translates Solid specific JSX/TSX source to standard JS, more
persice descriptions are in it's README.md.
For the port this JS/TS translating core part of Solid.js will probably need to be rewritten.
As you don't like to much of the JS, you might consider Rust and SWC (Speedy Web Compiler) at `https://swc.rs`.

Summary of the rewrite:
    - Rewriting the Solid.js compiler (and the vite plugin)
    - Possibly writing something like 'dom-expressions' (might not be needed because of compiler)
    - Integrating a new platform into Solid.js
    - Writing a runtime in C++ for UI & renering integrating with a JS engine
    - Allowing for JINDI interfacing between Java and C++ for features like (Asset Manager, Camera, ...)

