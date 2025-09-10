import { Ref, createMemo } from "solid-js";

export const BubbleHandle = () => (
    <svg viewBox="0 0 8 13" height="13" width="8" preserveAspectRatio="xMidYMid meet" class="" version="1.1" x="0px" y="0px">
        <path fill="currentColor" d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path>
    </svg>
)

export const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" height="22px">
        <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
    </svg>
);

function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}

const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
function makeId(len: number = 4): string {
    const result: string[] = [];
    for (let i = 0; i < len; i++) {
        result.push(characters.at(random(0, characters.length))!)
    }
    return result.join('')
}

export function CircleIcon(props: {
    ref?: Ref<SVGSVGElement>,
    p: number
}) {
    const MAX = 32.986722;

    return (
        <svg xmlns="http://www.w3.org/2000/svg" ref={props.ref} viewBox="0 0 12 12" class="circle">
            <circle cx="6" cy="6" r="5.25" 
                stroke-width="0.8" stroke="#f9f871" fill="none" stroke-dasharray={MAX.toString()}
                stroke-dashoffset={(MAX * Math.abs(1 - props.p)).toString()}
                />
        </svg>
    );
}

export const BulbIcon = (props: {
    p: number,
    onClick?: () => void,
    ref?: Ref<SVGSVGElement>
}) => {
    let id = makeId();

    const percentage = createMemo<string>(() => {
        const percentage1 = props.p * 100;

        return `${percentage1}%`;
    })

    return (
        <svg xmlns="http://www.w3.org/2000/svg" onClick={props.onClick} ref={props.ref} viewBox="0 0 16 16">
            <defs>
                <linearGradient id={id}>
                    <stop offset={percentage()} stop-color="#f9f871" />
                    <stop offset={percentage()} stop-color="#44474e" />
                </linearGradient>
            </defs>
            <path fill={`url(#${id})`} stroke="#f9f871" stroke-width="1" d="M 8 1 a 5 5 0 0 0 -3.479 8.592 c 0.263 0.254 0.514 0.564 0.676 0.941 L 5.83 12 h 4.342 l 0.632 -1.467 c 0.162 -0.377 0.413 -0.687 0.676 -0.941 A 5 5 0 0 0 8 1 z"/>
            <path fill="#f9f871" d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13a.5.5 0 0 1 0 1 .5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1 0-1 .5.5 0 0 1 0-1 .5.5 0 0 1-.46-.302l-.761-1.77a1.964 1.964 0 0 0-.453-.618A5.984 5.984 0 0 1 2 6zm6-5a5 5 0 0 0-3.479 8.592c.263.254.514.564.676.941L5.83 12h4.342l.632-1.467c.162-.377.413-.687.676-.941A5 5 0 0 0 8 1z"/>
        </svg>
    );
};
export const StarIcon = (props: { p: number, onClick?: () => void }) => {
    let id = makeId();

    return (
        <svg xmlns="http://www.w3.org/2000/svg" onClick={props.onClick} viewBox="0 0 16 16">
            <defs>
                <clipPath id={id}>
                    <rect x="0" y="0" width={props.p * 16} height="16"/>
                </clipPath>
            </defs>
            <path fill="currentColor" clip-path={`url(#${id})`} d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
            <path fill="currentColor" d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
        </svg>
    );
};
