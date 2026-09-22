import { JSX } from 'react';

import { Link, LinkProps } from 'react-router';
import classnames from 'classnames';

export function StyledLink({ className, ...props }: LinkProps): JSX.Element {
    return <Link className={classnames('text-link font-medium underline', className)} {...props} />;
}
