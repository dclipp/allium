import { NullExecutorArgument } from './null-executor-argument';

function isNullExecutorArgument( o: any ) : o is NullExecutorArgument {
    return o['_nullArgument'] === '_nullArgument';
}

export const ExecutorArgumentHelper: {
    isNullExecutorArgument: (o: any) => o is NullExecutorArgument,
    createNullArg: () => NullExecutorArgument
} = {
    isNullExecutorArgument: isNullExecutorArgument,
    createNullArg: () => {
        return {
            _nullArgument: '_nullArgument'
        };
    }
}
