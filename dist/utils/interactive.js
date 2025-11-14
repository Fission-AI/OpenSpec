export function isInteractive(noInteractiveFlag) {
    if (noInteractiveFlag)
        return false;
    if (process.env.OPEN_SPEC_INTERACTIVE === '0')
        return false;
    return !!process.stdin.isTTY;
}
//# sourceMappingURL=interactive.js.map