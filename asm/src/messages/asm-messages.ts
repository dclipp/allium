import { AsmMessageClassification } from './asm-message-classification'
import { AsmMessageTemplate } from './asm-message-template'

export class ASM_MESSAGES {
	public static readonly Parser: {
		readonly Stage1: {
			readonly NullOrEmptyContent: AsmMessageTemplate
		},
		readonly Stage2: {
			readonly InvalidMnemonic: AsmMessageTemplate,
			readonly UnrecognizedMnemonic: AsmMessageTemplate,
			readonly BadMnemonicCasing: AsmMessageTemplate,
			readonly MissingMnemonic: AsmMessageTemplate,
			readonly InvalidRegisterRef: AsmMessageTemplate,
			readonly UnopenedRegisterRef: AsmMessageTemplate,
			readonly UnterminatedRegisterRef: AsmMessageTemplate,
			readonly RegisterRefMissingBraces: AsmMessageTemplate,
			readonly InvalidInlineValue: AsmMessageTemplate,
			readonly InlineValueMissingHexPrefix: AsmMessageTemplate,
			readonly InvalidAutoAddressRef: AsmMessageTemplate,
			readonly AutoAddressRefMissingLabel: AsmMessageTemplate,
			readonly AutoAddressRefMissingExternalTarget: AsmMessageTemplate,
			readonly InvalidConstantInjector: AsmMessageTemplate,
			readonly ConstantInjectorMissingKey: AsmMessageTemplate,
			readonly ConstantInjectorMissingValue: AsmMessageTemplate,
			readonly InvalidContent: AsmMessageTemplate,
			readonly UnknownArgument: AsmMessageTemplate,
			readonly Directives: {
				readonly InvalidDirective: AsmMessageTemplate
			},
			readonly Blocks: {
				readonly BlockProblem: AsmMessageTemplate,
				readonly UnlabeledBlock: AsmMessageTemplate
			},
		},
		readonly Stage3: {
			readonly InvalidRegisterReference: AsmMessageTemplate,
			readonly InvalidRegisterName: AsmMessageTemplate,
			readonly InvalidNamedRegisterMask: AsmMessageTemplate,
			readonly InvalidNumericRegisterMask: AsmMessageTemplate,
			readonly InlineValueTooLarge: AsmMessageTemplate,
			readonly InvalidConstantInjectionKind: AsmMessageTemplate,
			readonly AutoAddressRefOrdinalTooLarge: AsmMessageTemplate,
			readonly AliasNotFound: AsmMessageTemplate,
			readonly InvalidInjectionValue: AsmMessageTemplate,
			readonly FlagInjectionBadCasing: AsmMessageTemplate,
			readonly VectorInjectionMagnitudeTooLarge: AsmMessageTemplate,
			readonly InvalidAutoAddressRef: AsmMessageTemplate,
			readonly AutoAddressRefInvalidAnchor: AsmMessageTemplate,
			readonly AutoAddressRefInvalidExpression: AsmMessageTemplate,
			readonly AutoAddressRefInvalidParameter: AsmMessageTemplate,
			readonly AutoAddressRefParameterTooLarge: AsmMessageTemplate,
			readonly AutoAddressRefInvalidOperator: AsmMessageTemplate
		},
		readonly Stage4: {
			readonly InvalidAutoAddressRef: AsmMessageTemplate,
			readonly AutoAddressRefLabelNotFound: AsmMessageTemplate,
			readonly AutoAddressRefTooLargeForInline: AsmMessageTemplate,
			readonly DirectiveNotFound: AsmMessageTemplate,
			readonly ImportError: AsmMessageTemplate,
			readonly ExternalObjectNotFound: AsmMessageTemplate,
			readonly ExternalObjectDoesNotContainLabel: AsmMessageTemplate
		},
		readonly Stage5: {
			readonly InlineValueTooLarge: AsmMessageTemplate,
			readonly ArgumentsResized: AsmMessageTemplate,
			readonly UnresolvedTargetBlockAddress: AsmMessageTemplate,
			readonly NotAnInlineValueMnemonic: AsmMessageTemplate
		},
		readonly GlobalPass: {
			readonly UnresolvedExternal: AsmMessageTemplate
		},
		readonly Validation: {
			readonly Instructions: {
				readonly InvalidArgument: AsmMessageTemplate,
				readonly ArgumentTypeMismatch: AsmMessageTemplate,
				readonly ArgumentCountMismatch: AsmMessageTemplate,
				readonly ArgumentSizeMismatch: AsmMessageTemplate,
				readonly ConditionalJumpValueAlwaysTrue: AsmMessageTemplate
			},
			readonly Blocks: {
				readonly BlockFallThrough: AsmMessageTemplate
			},
			readonly Directives: {
				readonly InvalidDirective: AsmMessageTemplate,
				readonly DuplicateDirective: AsmMessageTemplate,
				readonly DuplicateDirectiveRedeclaresGlobal: AsmMessageTemplate,
				readonly UnclosedSectionDirective: AsmMessageTemplate,
				readonly UnopenedSectionDirective: AsmMessageTemplate
			},
			readonly Options: {
				readonly InvalidBaseAddressOffset: AsmMessageTemplate
			},
		},
		readonly Common: {
			readonly UnexpectedException: AsmMessageTemplate,
			readonly UnexpectedCaseForView: AsmMessageTemplate,
			readonly UnresolvableDependencies: AsmMessageTemplate
		}

} = {
		Stage1: {
			NullOrEmptyContent: {
				hasCoordinates: false,
				code: 2001,
				classification: AsmMessageClassification.Fatal
			}
		},
		Stage2: {
			InvalidMnemonic: {
				hasCoordinates: true,
				code: 3001,
				classification: AsmMessageClassification.Critical
			},
			UnrecognizedMnemonic: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 3001
			},
			BadMnemonicCasing: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 3001
			},
			MissingMnemonic: {
				hasCoordinates: false,
				code: 3,
				classification: AsmMessageClassification.Critical,
				masterCode: 3001
			},
			InvalidRegisterRef: {
				hasCoordinates: true,
				code: 3101,
				classification: AsmMessageClassification.Critical
			},
			UnopenedRegisterRef: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 3101
			},
			UnterminatedRegisterRef: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 3101
			},
			RegisterRefMissingBraces: {
				hasCoordinates: true,
				code: 3,
				classification: AsmMessageClassification.Critical,
				masterCode: 3101
			},
			InvalidInlineValue: {
				hasCoordinates: true,
				code: 3201,
				classification: AsmMessageClassification.Critical
			},
			InlineValueMissingHexPrefix: {
				hasCoordinates: true,
				code: 3,
				classification: AsmMessageClassification.Critical,
				masterCode: 3201
			},
			InvalidAutoAddressRef: {
				hasCoordinates: true,
				code: 3401,
				classification: AsmMessageClassification.Critical
			},
			AutoAddressRefMissingLabel: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 3401
			},
			AutoAddressRefMissingExternalTarget: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 3401
			},
			InvalidConstantInjector: {
				hasCoordinates: true,
				code: 3501,
				classification: AsmMessageClassification.Critical
			},
			ConstantInjectorMissingKey: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 3501
			},
			ConstantInjectorMissingValue: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 3501
			},
			InvalidContent: {
				hasCoordinates: true,
				code: 3601,
				classification: AsmMessageClassification.Critical
			},
			UnknownArgument: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 3601
			},
			Directives: {
				InvalidDirective: {
					hasCoordinates: true,
					code: 3701,
					classification: AsmMessageClassification.Critical
				}
			},
			Blocks: {
				BlockProblem: {
					hasCoordinates: true,
					code: 3801,
					classification: AsmMessageClassification.Critical
				},
				UnlabeledBlock: {
					hasCoordinates: true,
					code: 1,
					classification: AsmMessageClassification.Critical,
					masterCode: 3801
				}
			},
		},
		Stage3: {
			InvalidRegisterReference: {
				hasCoordinates: true,
				code: 4001,
				classification: AsmMessageClassification.Critical
			},
			InvalidRegisterName: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 4001
			},
			InvalidNamedRegisterMask: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 4001
			},
			InvalidNumericRegisterMask: {
				hasCoordinates: true,
				code: 3,
				classification: AsmMessageClassification.Critical,
				masterCode: 4001
			},
			InlineValueTooLarge: {
				hasCoordinates: true,
				code: 4101,
				classification: AsmMessageClassification.Critical
			},
			InvalidConstantInjectionKind: {
				hasCoordinates: true,
				code: 4201,
				classification: AsmMessageClassification.Critical
			},
			AutoAddressRefOrdinalTooLarge: {
				hasCoordinates: true,
				code: 4301,
				classification: AsmMessageClassification.Critical
			},
			AliasNotFound: {
				hasCoordinates: true,
				code: 4401,
				classification: AsmMessageClassification.Critical
			},
			InvalidInjectionValue: {
				hasCoordinates: true,
				code: 4501,
				classification: AsmMessageClassification.Critical
			},
			FlagInjectionBadCasing: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 4501
			},
			VectorInjectionMagnitudeTooLarge: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 4501
			},
			InvalidAutoAddressRef: {
				hasCoordinates: true,
				code: 4601,
				classification: AsmMessageClassification.Critical
			},
			AutoAddressRefInvalidAnchor: {
				hasCoordinates: true,
				code: 4601,
				classification: AsmMessageClassification.Critical,
				masterCode: 4601
			},
			AutoAddressRefInvalidExpression: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 4601
			},
			AutoAddressRefInvalidParameter: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 4601
			},
			AutoAddressRefParameterTooLarge: {
				hasCoordinates: true,
				code: 3,
				classification: AsmMessageClassification.Critical,
				masterCode: 4601
			},
			AutoAddressRefInvalidOperator: {
				hasCoordinates: true,
				code: 4,
				classification: AsmMessageClassification.Critical,
				masterCode: 4601
			}
		},
		Stage4: {
			InvalidAutoAddressRef: {
				hasCoordinates: true,
				code: 5001,
				classification: AsmMessageClassification.Critical
			},
			AutoAddressRefLabelNotFound: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 5001
			},
			AutoAddressRefTooLargeForInline: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 5001
			},
			DirectiveNotFound: {
				hasCoordinates: true,
				code: 5101,
				classification: AsmMessageClassification.Critical
			},
			ImportError: {
				hasCoordinates: true,
				code: 5201,
				classification: AsmMessageClassification.Critical
			},
			ExternalObjectNotFound: {
				hasCoordinates: true,
				code: 1,
				classification: AsmMessageClassification.Critical,
				masterCode: 5201
			},
			ExternalObjectDoesNotContainLabel: {
				hasCoordinates: true,
				code: 2,
				classification: AsmMessageClassification.Critical,
				masterCode: 5201
			}
		},
		Stage5: {
			InlineValueTooLarge: {
				hasCoordinates: true,
				code: 6001,
				classification: AsmMessageClassification.Critical
			},
			ArgumentsResized: {
				hasCoordinates: true,
				code: 6002,
				classification: AsmMessageClassification.Critical
			},
			UnresolvedTargetBlockAddress: {
				hasCoordinates: true,
				code: 6003,
				classification: AsmMessageClassification.Critical
			},
			NotAnInlineValueMnemonic: {
				hasCoordinates: true,
				code: 6004,
				classification: AsmMessageClassification.Critical
			}
		},
		GlobalPass: {
			UnresolvedExternal: {
				hasCoordinates: true,
				code: 7001,
				classification: AsmMessageClassification.Critical
			}
		},
		Validation: {
			Instructions: {
				InvalidArgument: {
					hasCoordinates: true,
					code: 8001,
					classification: AsmMessageClassification.Critical
				},
				ArgumentTypeMismatch: {
					hasCoordinates: true,
					code: 1,
					classification: AsmMessageClassification.Critical,
					masterCode: 8001
				},
				ArgumentCountMismatch: {
					hasCoordinates: true,
					code: 2,
					classification: AsmMessageClassification.Critical,
					masterCode: 8001
				},
				ArgumentSizeMismatch: {
					hasCoordinates: true,
					code: 3,
					classification: AsmMessageClassification.Critical,
					masterCode: 8001
				},
				ConditionalJumpValueAlwaysTrue: {
					hasCoordinates: true,
					code: 8101,
					classification: AsmMessageClassification.Warning
				}
			},
			Blocks: {
				BlockFallThrough: {
					hasCoordinates: true,
					code: 8501,
					classification: AsmMessageClassification.Critical
				}
			},
			Directives: {
				InvalidDirective: {
					hasCoordinates: true,
					code: 9001,
					classification: AsmMessageClassification.Critical
				},
				DuplicateDirective: {
					hasCoordinates: true,
					code: 1,
					classification: AsmMessageClassification.Critical,
					masterCode: 9001
				},
				DuplicateDirectiveRedeclaresGlobal: {
					hasCoordinates: true,
					code: 2,
					classification: AsmMessageClassification.Critical,
					masterCode: 9001
				},
				UnclosedSectionDirective: {
					hasCoordinates: true,
					code: 3,
					classification: AsmMessageClassification.Critical,
					masterCode: 9001
				},
				UnopenedSectionDirective: {
					hasCoordinates: true,
					code: 4,
					classification: AsmMessageClassification.Critical,
					masterCode: 9001
				}
			},
			Options: {
				InvalidBaseAddressOffset: {
					hasCoordinates: false,
					code: 9101,
					classification: AsmMessageClassification.Critical
				}
			},
		},
		Common: {
			UnexpectedException: {
				hasCoordinates: false,
				code: 1101,
				classification: AsmMessageClassification.Fatal
			},
			UnexpectedCaseForView: {
				hasCoordinates: true,
				code: 1102,
				classification: AsmMessageClassification.Fatal
			},
			UnresolvableDependencies: {
				hasCoordinates: false,
				code: 1103,
				classification: AsmMessageClassification.Critical
			}
		}

	}

}