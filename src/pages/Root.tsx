import { JSX, onMount, useContext } from "solid-js";
import { useAuthentication } from "../client";
import { Navigate } from "@solidjs/router";
import { IsMobileContext } from "../App";
import QuiptQ from "../components/Quipt-Q";

function LandingPage(): JSX.Element {
    return (
        <div class="landing-page">
            <QuiptQ/>
        </div>
    );
}

export function Root(): JSX.Element {
    const authentication = useAuthentication()!;
    const isMobile = useContext(IsMobileContext)!;
    onMount(() => {
        document.title = "Quipt";
    })
    return (
        <>
            {
                !authentication.isLoggedIn() 
                    ? <Navigate href="/signin"/>
                    : (isMobile()
                        ? <Navigate href="/script"/>
                        : <LandingPage/>)
            }
        </>
    );
}

