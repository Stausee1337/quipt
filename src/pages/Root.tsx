import { JSX } from "solid-js";
import { useAuthentication } from "../backend";
import { Navigate } from "@solidjs/router";

export function Root(): JSX.Element {
    const authentication = useAuthentication()!;
    return (
        <>
            {authentication.isLoggedIn() ? <Navigate href="/script"/> : <Navigate href="/signin"/>}
        </>
    );
}

