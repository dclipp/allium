# Language Reference

## Instructions

An instruction has the format

&nbsp;&nbsp;&nbsp;&lt;**Mnemonic**&gt; &lt;**Arg 1 ?**&gt; &lt;**Arg 2 ?**&gt; &lt;**Arg 3?**&gt;

where
* **Mnemonic** is a string literal naming a CPU operation
* **Arg** *n* is an <a href="##Arguments">argument</a>, or **(empty)**

## Arguments

### Register Reference

A **Register Reference** is a literal which refers to a single specific register segment. A register reference is of the format

&nbsp;&nbsp;&nbsp;`[` &lt;**Register Name**&gt; `]`

or

&nbsp;&nbsp;&nbsp;`[` &lt;**Register Name**&gt; `.` &lt;**Register Mask**&gt; `]`

where
* **Register Name** is one of the following case-sensitive literals:
    * INSPTR
    * ACCUMULATOR
    * MONDAY
    * TUESDAY
    * WEDNESDAY
    * THURSDAY
    * FRIDAY

* **Register Mask**, if provided, is one of the following case-sensitive literals
    * H
        * Refers to the highest 2 bytes of a register, i.e. byte indices 0 and 1
    * HH
        * Refers to the single highest byte of a register, i.e. byte index 0
    * HL
        * Refers to the lower byte of the highest 2 bytes of a register, i.e. byte index 1
    * HX
        * Refers to the highest 3 bytes of a register, i.e. byte indices 0, 1, and 2
    * L
        * Refers to the lowest 2 bytes of a register, i.e. byte indices 2 and 3
    * LH
        * Refers to the high byte of the lowest 2 bytes of a register, i.e. byte index 2
    * LL
        * Refers to the single lowest byte of a register, i.e. byte index 3
    * LX
        * Refers to the lowest 3 bytes of a register, i.e. byte indices 1, 2, and 3


## Directives
A **directive** is an annotation or rule to be interpreted and evaluated by the preprocessor

A directive has the format

&nbsp;&nbsp;&nbsp;`?`&lt;**Command**&gt; &lt;**Receiver**&gt;

or

&nbsp;&nbsp;&nbsp;`?`&lt;**Command**&gt; &lt;**Receiver**&gt; `=` &lt;**Parameter**&gt;

where
* **Command** is the action or meaning of the directive
* **Receiver** is the name that will be used within the directive's scope to reference the directive (if applicable)
* **Parameter** is the assigned value of the directive 

### `import`

- **Requires receiver?**: Yes
- **Requires assignment?**: Yes

#### Symbol import
Imports a specific symbol from an object

`?import `&lt;Name to be referred to in **importing** source file&gt; ` =` &lt;Object name containing the symbol&gt; `:`&lt;Name of the symbol in the **imported** object&gt;

##### ex. importing a block named &quot;Foo&quot; from object &quot;Bar&quot; as &quot;MyBlock&quot;:
*Filemap*:
```json
[
    {
        referenceName: "Bar"
        filePath: "/User/bar.aq"
    },
    {
        referenceName: "MainSource"
        filePath: "/User/main_source.aq"
    }
]
```

*Bar&period;aq*:

    Foo:
        END

*MainSource&period;aq*:

    ?import MyBlock = Bar:Foo
    Hello:
        JMPI MyBlock

#### Object import
Imports an entire object

`?import `&lt;Name to be referred to in **importing** source file&gt; ` =` &lt;Object name to be **imported**&gt;

##### ex. importing an object named &quot;Bar&quot; as &quot;AnotherObject&quot;:
*Filemap*:
```json
[
    {
        referenceName: "Bar"
        filePath: "/User/bar.aq"
    },
    {
        referenceName: "MainSource"
        filePath: "/User/main_source.aq"
    }
]
```

*Bar&period;aq*:

    Foo:
        ADD [MONDAY]
        END

*MainSource&period;aq*:

    ?import AnotherObject = Bar
    Hello:
        *your code here*

### Bounded Directives

A **bounded directive** is a section of a source file that carries a special meaning and has its own formatting rules.

**Bounded directives** consist of three ordered parts:
1. A **beginsection** directive which indicates the start of the section
2. The content lines for the directive
3. An **endsection** directive which indicates the end of a section

```

?beginsection <Section Type>

<...section lines>

?endsection <Section Type>

```

Note that **bounded directives** cannot be nested.

#### ex. a **data part** section:
```
?beginsection datapart

'Set data byte at 125 to 3
125: 3

'Set data byte at 126 to 4, byte at 127 to 0xb
126: [4, 0xb]

?endsection datapart
```