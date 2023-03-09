export enum DirectiveCommand {
    Alias,
    Import,
    Beginsection,
    Endsection
}

export const DirectiveCommandMap: {
    readonly alias: DirectiveCommand,
    readonly import: DirectiveCommand,
    readonly beginsection: DirectiveCommand,
    readonly endsection: DirectiveCommand
} = {
    alias: DirectiveCommand.Alias,
    import: DirectiveCommand.Import,
    beginsection: DirectiveCommand.Beginsection,
    endsection: DirectiveCommand.Endsection
}