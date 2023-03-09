// import { Register } from "./register";
// import { RegisterMask } from "./register-mask";

// export const RegisterLists = {
//     Numerics: [
//     {
//         Register: Register.InstructionPtr,
//         Mask: RegisterMask.Full,
//         value: 0
//     },
//     {
//         Register: Register.Accumulator,
//         Mask: RegisterMask.Full,
//         value: 1
//     },
//     {
//         Register: Register.Monday,
//         Mask: RegisterMask.Full,
//         value: 2
//     },
//     {
//         Register: Register.Tuesday,
//         Mask: RegisterMask.Full,
//         value: 3
//     },
//     {
//         Register: Register.Wednesday,
//         Mask: RegisterMask.Full,
//         value: 4
//     },
//     {
//         Register: Register.Thursday,
//         Mask: RegisterMask.Full,
//         value: 5
//     },
//     {
//         Register: Register.Friday,
//         Mask: RegisterMask.Full,
//         value: 6
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.HighHigh,
//         value: 7
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.HighHigh,
//         value: 8
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.HighHigh,
//         value: 9
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.HighHigh,
//         value: 10
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.HighHigh,
//         value: 11
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.HighHigh,
//         value: 12
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.HighHigh,
//         value: 13
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.HighLow,
//         value: 14
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.HighLow,
//         value: 15
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.HighLow,
//         value: 16
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.HighLow,
//         value: 17
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.HighLow,
//         value: 18
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.HighLow,
//         value: 19
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.HighLow,
//         value: 20
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.LowLow,
//         value: 21
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.LowLow,
//         value: 22
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.LowLow,
//         value: 23
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.LowLow,
//         value: 24
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.LowLow,
//         value: 25
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.LowLow,
//         value: 26
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.LowLow,
//         value: 27
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.LowHigh,
//         value: 28
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.LowHigh,
//         value: 29
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.LowHigh,
//         value: 30
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.LowHigh,
//         value: 31
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.LowHigh,
//         value: 32
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.LowHigh,
//         value: 33
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.LowHigh,
//         value: 34
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.High,
//         value: 35
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.High,
//         value: 36
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.High,
//         value: 37
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.High,
//         value: 38
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.High,
//         value: 39
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.High,
//         value: 40
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.High,
//         value: 41
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.Low,
//         value: 42
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.Low,
//         value: 43
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.Low,
//         value: 44
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.Low,
//         value: 45
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.Low,
//         value: 46
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.Low,
//         value: 47
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.Low,
//         value: 48
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 49
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 50
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 51
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 52
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 53
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 54
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.ExtendedHigh,
//         value: 55
//     },
//     {
//         Register: Register.InstructionPtr,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 56
//     },
//     {
//         Register: Register.Accumulator,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 57
//     },
//     {
//         Register: Register.Monday,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 58
//     },
//     {
//         Register: Register.Tuesday,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 59
//     },
//     {
//         Register: Register.Wednesday,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 60
//     },
//     {
//         Register: Register.Thursday,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 61
//     },
//     {
//         Register: Register.Friday,
// 		Mask: RegisterMask.ExtendedLow,
//         value: 6
//     }]
// }