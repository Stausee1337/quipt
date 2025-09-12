import { Component, createEffect, createSignal, JSX } from "solid-js";
import { Observable, $ } from "./observable";

export type Route = {
    url: string,
    element: Component<any>,
    staticTitle?: string | undefined
};

type FrameCallback = () => (() => void);

export class Router {
    private _routes: Map<string, Route> = new Map();
    
    public currentTitle = new Observable<string|null>(null);
    public currentFactory = new Observable<Component|null>(null);
    public canGoBack = new Observable<boolean>(false);
    public frameDispose: (() => void)|undefined = undefined;

    constructor(...routes: Route[]) {
        for (let route of routes) {
            this._routes.set(route.url, route);
        }
        this.currentTitle.subscribe(value => {
            if (value != null)
                document.title = value;
        });
        window.navigation.addEventListener('navigate', event => {
            console.log(event);
            event.intercept();
        });
        // window.addEventListener('popstate', (e) => {
        //     if(this.frameDispose !== undefined) {
        //         const dispose = this.frameDispose;
        //         this.frameDispose = undefined;
        //         dispose();
        //         return;
        //     }
        //     this.setCurrentTitle();
        //     this.setCurrentFactory();
        //     this.setCanGoBack();
        // });
        this.setCurrentTitle();
        this.setCurrentFactory();
        this.setCanGoBack();
    }

    get currentUrl(): string {
        return location.pathname;
    }

    public setTitle(title: string) {
        this.currentTitle.set(title);
    }

    public route(toUrl: string, state: any | null = null) {
        if (!this._routes.has(toUrl)) {
            throw 'Tried to route to non-existing url';
        }
        window.navigation.navigate(toUrl);
        this.setCurrentTitle();
        this.setCurrentFactory();
        this.setCanGoBack();
    }

    public goBack() {
        history.back();
    }

    public currentContents(): any {
        const factoryGetter = $(this.currentFactory);

        return (
            <div class="routing-contents">
                { factoryGetter() != null ? 
                    <AutoInstanciate factory={factoryGetter()!}/> : null }
            </div>
        );
    }

    public pushFrame(hash: string, cb: FrameCallback) {
        history.pushState(history.state, '', `${location.pathname}#${hash}`);
        this.frameDispose = cb();
    }

    private setCanGoBack() {
        this.canGoBack.set(Boolean(this.currentUrl.split('/')[1]));
    }

    private setCurrentFactory() {
        const currentRoute = this._routes.get(this.currentUrl);
        if (currentRoute == undefined) {
            this.currentFactory.set(null);
            return;
        }
        this.currentFactory.set(currentRoute.element); 
    }

    private setCurrentTitle() {
        const currentRoute = this._routes.get(this.currentUrl);
        if (currentRoute == undefined) {
            this.currentTitle.set(null);
            return;
        }
        if (currentRoute.staticTitle != undefined) {
            this.currentTitle.set(currentRoute.staticTitle);
            return;
        }
        this.currentTitle.set(null);
    }
}

function AutoInstanciate(props: { factory: Component }) {
    const [component, setComponent] = createSignal<JSX.Element|null>(null);

    createEffect(() => {
        const component = <props.factory {...history.state}/>;
        setComponent(component);
    })
    return <>{ component() }</>;
}

