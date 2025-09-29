import { JSX, onCleanup, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";
import { A, useBeforeLeave } from "@solidjs/router";
import { useAuthentication } from "../backend";
import { ScriptContextObj } from "../script";
import QuiptLogo from "./Quipt-Logo";

function ListElement(
    props: {
        icon?: string,
        children: JSX.Element,
        static?: boolean,
        current?: boolean,
        href?: string
    }
): JSX.Element {
    
    return (
        <Dynamic component={props.href === undefined ? 'span' : A}
            href={props.href}
            class="list-element"
            classList={{ static: props.static, current: props.current }}>
            { 
                props.icon !== undefined 
                    ? <i class={`bi bi-${props.icon}`}/> 
                    : null
            }
            { props.children }
        </Dynamic>
    );
}

export function MenuElement(
    props: {
        closer?: () => void
    }
): JSX.Element {
    const authentication = useAuthentication()!;
    const closer = props.closer;
    const [user, {}] = authentication.requests!.getCached("/get-user");
    const [scripts , {}] = authentication.requests!.getCached("/list-scripts");
    const scriptContext = useContext(ScriptContextObj)!;

    if (closer !== undefined) {
        useBeforeLeave(() => {
            closer();
        })
        const unsubscribe = authentication.onLogout.subscribe(() => {
            closer();
        });
        onCleanup(() => {
            unsubscribe();
        })
    }

    function closeButton(): JSX.Element {
        return (
            <button class="close" onClick={props.closer}>
                <i class="bi bi-x"/>
            </button>
        )
    }

    return (
        <nav class="side-menu">
            <div class="header">
                <div class="top-line">
                    {
                        closer !== undefined 
                            ? closeButton()
                            : <A href="/" style={{color: 'inherit'}}>
                                <QuiptLogo/>
                            </A>
                    }
                </div>

                <ListElement icon="pencil-square">
                    Neues Skript
                </ListElement>

                <ListElement static>
                    <h3>Skripte</h3>
                </ListElement>
            </div>

            <div>
                 { 
                     (scripts.loading || scripts.error) ? null :
                         scripts()!.map(
                             v => (
                                 <ListElement href={`/script/${v.uuid}`}
                                    current={v.uuid === scriptContext.currentScript}>
                                 { v.name }
                                 </ListElement>))
                 }
            </div>

            {
                (user.loading || user.error) ? null :
                <div class="footer">
                    <ListElement icon="person-circle" static>
                        <span style="flex:1">{ user()!.username }</span>
                        <button class="secondary-button"
                            onClick={() => authentication.logout()}>
                            Logout
                        </button>
                    </ListElement>
                </div>
            }
        </nav>
    );
}
