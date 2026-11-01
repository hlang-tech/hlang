/**
 * Component stylesheets are imported for their side effect (`import './x.css'`)
 * and aggregated into `styles.css` at build time. This declares them for the
 * type checker, which checks side-effect imports since TypeScript 6.
 */
declare module '*.css';
