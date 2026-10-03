import { type ComponentProps, type JSX } from 'react';

import { Link, type LinkProps } from 'react-router';
import classnames from 'classnames';

export const linkStyle =
    'text-link cursor-pointer font-medium underline data-disabled:cursor-not-allowed data-disabled:opacity-50';

function isLinkProps(props: LinkProps | ComponentProps<'a'>): props is LinkProps {
    return Object.keys(props).includes('to');
}

export function StyledLink(props: LinkProps | ComponentProps<'a'>): JSX.Element {
    if (isLinkProps(props)) {
        const { className, ...rest } = props;
        return <Link className={classnames(linkStyle, props.className)} {...rest} />;
    }
    const { className, ...rest } = props;
    return <a className={classnames(linkStyle, props.className)} {...rest} />;
}
