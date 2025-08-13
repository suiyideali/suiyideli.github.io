---
title: Go语言学习-反射
published: 2025-07-20
description: 'Go 语言中的反射（reflection）由标准库 reflect 包提供，它允许程序在 运行时 动态地检查、修改和操作变量的类型和值。'
image: ''
tags: [Golang]
category: '编程'
draft: false 
lang: ''
---

# 反射介绍

1. 反射可以在运行时动态获取变量的各种信息，比如变量的类型（type），类别（kind）
2. 如果是结构体变量，还可以获取到结构体本身的信息（包括结构体的字段、方法）
3. 通过反射，可以修改变量的值，可以调用关联的方法

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250720160733255.png)

## 反射重要的函数和概念

1. reflect.TypeOf(变量名)，获取变量的类型，返回reflect.Type类型
2. reflect.ValueOf(变量名)，获取变量的值，返回reflect.Value类型reflect.Value是一个结构体类型

```go
type Value struct {
	//内含隐藏或非导出字段
}
```

1. 变量、interface{} 和 reflect.Value是可以相互转换

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250720160733396.png)

![image.png](https://ob-typora.oss-cn-shanghai.aliyuncs.com/images/20250720160733375.png)

# 案例演示

1. 请编写一个案例，演示对(基本数据类型、interface{}、reflect.Value)进行反射的基本操作以及演示对(结构体类型、interface{}、reflect.Value)进行反射的基本操作

```go
package main

import (
	"fmt"
	"reflect"
)

// Student 定义一个学生结构体
type Student struct {
	Name string // 姓名
	Age  int    // 年龄
}

func reflectTest01(b interface{}) {
	// 通过反获取的传入变量的 type, kind 值
	// 1. 先获取到reflect.Type
	rType := reflect.TypeOf(b)
	fmt.Println("rType的类型:", rType) // rType: int
	// 2. 获取到reflect.Value
	rVal := reflect.ValueOf(b)
	n2 := 2 + rVal.Int() // rVal.Int() 获取到int类型的值
	fmt.Println("n2的值:", n2) // n2: 102
	fmt.Printf("rVal的值: %v, rVal type: %T\n", rType, rVal) // rType的类型: reflect.Type, rVal的类型: reflect.Value

	// 将 rVal 转换为 interface{} 类型
	iV := rVal.Interface()
	// 将 interface{} 通过断言转成需要的类型
	num2 := iV.(int)
	fmt.Println("num的值:", num2)
}

// reflectTest02 演示如何使用反射获取结构体的字段信息
func reflectTest02(b interface{}) {
	rType := reflect.TypeOf(b)
	fmt.Println("rType的类型:", rType) // rType: main.Student
	// 获取到reflect.Value
	rVal := reflect.ValueOf(b)
	fmt.Println("rVal的类型:", rVal) //
	// 将 rVal 转换为 interface{} 类型
	iV := rVal.Interface()
	fmt.Printf("iV的值: %v, iV type: %T\n", iV, iV) // iV的值: {Tom 20}, iV type: main.Student
	stu, ok := iV.(Student) // 断言为 Student 类型
	if ok {
		fmt.Println("学生姓名:", stu.Name) // 学生姓名: Tom
		fmt.Println("学生年龄:", stu.Age)  // 学生年龄: 20
	} else {
		fmt.Println("类型断言失败")
	}
}

func main() {
	// 1. 定义一个Int
	var num int = 100
	reflectTest01(num)
	// 2. 定义一个Student的实例
	stu := Student {
		Name: "Tom",
		Age:  20,
	}
	fmt.Println("==============")
	reflectTest02(stu)
}
```

输出结果

```bash
rType的类型: int
n2的值: 102
rVal的值: int, rVal type: reflect.Value
num的值: 100
==============
rType的类型: main.Student
rVal的类型: {Tom 20}
iV的值: {Tom 20}, iV type: main.Student
学生姓名: Tom
学生年龄: 20
```

# 反射注意事项和细节说明

## 1. reflect.Value.Kind

获取变量的类型，返回的是一个常量

```go
func reflectTest02(b interface{}) {
	rType := reflect.TypeOf(b)
	fmt.Println("rType的类型:", rType) // rType: main.Student
	// 获取到reflect.Value
	rVal := reflect.ValueOf(b)
	fmt.Println("rVal的类型:", rVal) //
	// 将 rVal 转换为 interface{} 类型
	iV := rVal.Interface()
	fmt.Printf("iV的值: %v, iV type: %T\n", iV, iV) // iV的值: {Tom 20}, iV type: main.Student
	stu, ok := iV.(Student) // 断言为 Student 类型
	if ok {
		fmt.Println("学生姓名:", stu.Name) // 学生姓名: Tom
		fmt.Println("学生年龄:", stu.Age)  // 学生年龄: 20
	} else {
		fmt.Println("类型断言失败")
	}

	//3. 获取变量对应的Kind
	kind1 := rVal.Kind()
	kind2 := rType.Kind()
	fmt.Printf("kind1: %v, kind2: %v\n", kind1, kind2) // kind1: struct, kind2: struct
}
```

输出结果

```bash
rType的类型: main.Student
rVal的类型: {Tom 20}
iV的值: {Tom 20}, iV type: main.Student
学生姓名: Tom
学生年龄: 20
kind1: struct, kind2: struct
```

## 2. Type是类型，Kind是类别

Type和Kind 可能是相同的，也可能是不同的，比如

```go
var num int = 10 // num的Type是int, Kind也是int
var stu Student // stu的Type是 pkg1.Student，Kind是struct
```

## 3. 通过反射可以在让变量在interface和Reflect.Value之间相互转换

## 4. 使用反射的方式来获取变量的值(并返回对应的类型)，要求数据类型匹配

比如x是int， 那么就应该使用reflect.Value(x).lnt()，而不能使用其它的，否则报panic

### **func (Value) [Int](https://github.com/golang/go/blob/master/src/reflect/value.go?name=release#1031)**

```go
func (vValue) Int()int64
```

返回v持有的有符号整数（表示为int64），如果v的Kind不是Int、Int8、Int16、Int32、Int64会panic

## 5. 通过反射来修改变量

注意当时用SetXxxx方法，需要通过对应的指正类型来完成，这也才能完成改变传入的变量的值，同时需要使用到reflect.Value.Elem()方法

### **func (Value) [Elem](https://github.com/golang/go/blob/master/src/reflect/value.go?name=release#831)**

```go
func (vValue) Elem()Value
```

Elem返回v持有的接口保管的值的Value封装，或者v持有的指针指向的值的Value封装。如果v的Kind不是Interface或Ptr会panic；如果v持有的值为nil，会返回Value零值。

代码演示

```go
package main

import (
	"fmt"
	"reflect"
)

func reflectDemo(b interface{}) {
	rVal := reflect.ValueOf(b)
	fmt.Printf("rVal kind is %v\n", rVal.Kind())
	rVal.Elem().SetInt(100) // 修改指针指向的值
	// 通过反射获取修改后的值
}

func main() {
	num := 10
	reflectDemo(&num)
	fmt.Println("num value:", num)
}
```

## 6. 如何理解 rVal.Elem().SetInt(100)

在Go语言中，`rVal.Elem().SetInt(100)` 的作用是**通过反射修改指针指向的值** 。具体解析如下：

---

### **1. 反射基础**

Go的反射机制允许在运行时动态地获取或修改变量的类型和值。关键概念：

- **`reflect.ValueOf(b)`** ：获取变量`b`的反射值对象。
- **`reflect.Type`** ：表示变量的类型信息。
- **可设置性（Addressable）** ：只有变量是可寻址的（如指针指向的值），才能通过反射修改其值。

---

### **2. 代码解析**

**(1) 函数调用上下文**

```go
num := 10
reflectDemo(&num)
```

- `num` 是一个 `int` 类型的变量，初始值为10。
- `reflectDemo` 接收一个 `interface{}` 参数，实际传入的是 `num` 的指针（`int`）。

**(2) 获取反射值**

```go
rVal := reflect.ValueOf(b)
```

- `b` 的动态类型是 `int`，因此 `rVal.Kind()` 返回 `reflect.Ptr`。
- 此时 `rVal` 表示的是指针本身，而非指针指向的值。

**(3) 解引用指针并修改值**

```go
rVal.Elem().SetInt(100)
```

- **`rVal.Elem()`** ：
  - 对指针类型（`reflect.Ptr`）调用 `Elem()`，返回指针指向的值的反射值对象。
  - 此时 `rVal.Elem()` 表示 `num` 的反射值（类型为 `int`）。
- **`SetInt(100)`** ：
  - 将 `num` 的值修改为100。注意：
    - `SetInt` 的参数是 `int64` 类型，Go会自动将 `100` 转换为 `int64`。
    - 修改的是原始变量 `num` 的值，因为 `rVal` 是指向 `num` 的指针。

**(4) 验证修改结果**

```go
fmt.Println("num value:", num) // 输出: num value: 100
```

- 反射成功修改了 `num` 的值。

---

### **3. 关键注意事项**

- **必须使用指针** ：反射只能修改可寻址的值。若直接传入 `num`（非指针），`rVal.Elem()` 会引发 panic（不能对非指针类型调用 `Elem()`）。
- **类型匹配** ：`SetInt` 仅适用于 `int` 类型。若目标类型是 `int32` 或其他类型，需使用对应的 `SetInt32` 等方法。
- **可设置性检查** ：反射值必须是可设置的（如变量地址），否则 `SetInt` 会 panic。

---

### **4. 完整流程图解**

```
主函数：
num := 10           → 类型: int, 值: 10
reflectDemo(&num)   → 传入 *int 指针

reflectDemo 函数：
b = interface{}(*int) → 动态类型为 *int
rVal = reflect.ValueOf(b) → Kind: reflect.Ptr
rVal.Elem()          → 获取指向的 int 值的反射值
rVal.Elem().SetInt(100) → 修改 num 为 100
```

---

### **5. 常见错误场景**

- **非指针传参** ：

  ```go
  reflectDemo(num) // 错误！rVal.Kind() 是 int，rVal.Elem() 会 panic
  ```

- **类型不匹配** ：

  ```go
  var num int32
  
  reflectDemo(&num) // 错误！SetInt(100) 需要 int 类型，而 num 是 int32
  ```

---

### **6. 总结**

`rVal.Elem().SetInt(100)` 的本质是通过反射修改指针指向的值。其核心步骤为：

1. **获取指针的反射值** （`reflect.ValueOf`）。
2. **解引用指针** （`Elem()`）得到目标值。
3. **调用 `SetInt` 修改值** 。

此操作依赖于指针的可寻址性，且需确保类型匹配，是Go反射修改变量的经典用法。

# 练习

## 练习1

给一个变量 var v float64 = 1.2，请使用反射来得到它的reflect.Value，然后获取对应的Type，Kind和值，并将reflect.Value转换成interface{}，再将interface{}转换成float64

```go
package main

import (
	"fmt"
	"reflect"
)

func reflectDemo(b interface{}) {
	rType := reflect.TypeOf(b)
	fmt.Println("rType的类型:", rType)
	// 获取reflect.Value
	rVal := reflect.ValueOf(b)
	fmt.Println("rVal的类型:", rVal.Type())
	kind1 := rVal.Kind()
	kind2 := rType.Kind()
	fmt.Println("Kind1, Kind2:", kind1, kind2)
	// 将 rVal 转换为 interface{}
	// 通过 rVal.Interface() 获取原始值
	// 注意：如果 rVal 是指针类型，rVal.Interface() 返回的是指针的值
	iV := rVal.Interface()
	fmt.Printf("iv的值: %v, 类型: %T\n", iV, iV)
	// 将 interface{} 转换成float64
	fmt.Printf("fv的值: %v, 类型: %T\n", iV, iV)

	// 判断是否为指针，如果是则获取其指向的元素
	if rVal.Kind() == reflect.Ptr {
		// 获取指针指向的值
		rVal = rVal.Elem()
		iV = rVal.Interface()
	}
	fv := iV.(float64)
	fmt.Printf("fv的值: %v, 类型: %T\n", fv, fv)
}

func main() {
	var v float64 = 1.2
	reflectDemo(&v)
}
```

输出结果

```bash
rType的类型: *float64
rVal的类型: *float64
Kind1, Kind2: ptr ptr
iv的值: 0xc00000a0c8, 类型: *float64
fv的值: 0xc00000a0c8, 类型: *float64
fv的值: 1.2, 类型: float64
```

## 练习2

查看代码，判断是否正确并修改

原代码

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	var str string = "tom"
	fs := reflect.ValueOf(str)
	fs.SetString("jerry") // This will panic because strings are immutable in Go
	fmt.Printf("%v\n", str)
}
```

> 错误原因：
> 因为当时用SetXxxx方法，需要通过对应的指正类型来完成，这也才能完成改变传入的变量的值，同时需要使用到reflect.Value.Elem()方法。

修改为正确的代码

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	var str string = "tom"
	// fs := reflect.ValueOf(&str)
	// fs.Elem().SetString("jerry")
	// 上面两行等价于下面两行
	fs := reflect.ValueOf(&str).Elem()
	fs.SetString("jerry")
	fmt.Printf("%v\n", str)
}
```

# 反射最佳实践

## 1. 使用反射来遍历结构体的字段，调用结构体的方法，并获取结构体标签的值

重要的两个函数

**func (Value) Method**

```go
func (v Value) Method(i int) Value
```

**func (Value) Call**

```go
func (v Value) Call(in []Value) []Value
```

```go
package main

import (
	"fmt"
	"reflect"
)

// 定义一个Monster结构体
type Monster struct {
	Name string `json:"name"`
	Age  int    `json:"monster_age"`
	Score float32	`json:"成绩"`
	Sex  string
}
//方法 显示s的值
func (s Monster) Print() {
	fmt.Println("---strat----")
	fmt.Println(s)
	fmt.Println("---end----")
}
// 方法 返回两个数的和
func (s Monster) GetSum(n1, n2 int) int {
	return n1 + n2
}
// 方法 修改Monster的值	
func (s Monster) Set(name string, age int, score float32, sex string) {
	s.Name = name
	s.Age = age
	s.Score = score
	s.Sex = sex
}

func TestStruct(a interface{}) {
	typ := reflect.TypeOf(a)
	val := reflect.ValueOf(a)
	kd := val.Kind()
	if kd != reflect.Struct {
		fmt.Println("a is not struct")
		return
	}
	num := typ.NumField()
	fmt.Printf("struct 有 %d 个字段\n", num)
	for i := 0; i < num; i++ {
		fmt.Printf("Field %d 的值为%v\n", i, val.Field(i))
		// 获取到struct标签，注意需要通过reflect.Type来获取
		tagVal := typ.Field(i).Tag.Get("json")
		if tagVal != "" {
			fmt.Printf("Field %d 的tag值为=%v\n", i, tagVal)
		}
	}
	fmt.Printf("struct has %d fields\n", num)
	numOfMethod := typ.NumMethod()
	fmt.Printf("struct has %d methods\n", numOfMethod)
	for i := 0; i < numOfMethod; i++ {
		fmt.Printf("第 %d 个方法名称为%v\n", i, typ.Method(i).Name)
	}

	// var params []reflect.Value
	// 这是因为在 Go 的反射机制中，Method(index) 调用时，方法的索引是按照方法名称的字母顺序来排序
	// 在这个 Monster 结构体中，方法按字母顺序排列为：
	// GetSum, Print, Set
	val.Method(1).Call(nil)
	// 调用结构体的第1个方法Method(0)
	var params []reflect.Value
	params = append(params, reflect.ValueOf(10))
	params = append(params, reflect.ValueOf(20))
	res := val.Method(0).Call(params) // 传入的参数是 []reflect.Value
	fmt.Printf("res=%d\n", res[0].Int()) // 返回结果，返回的结果是[]reflect.Value

}

func main() {
	var a Monster = Monster{
		Name:  "牛魔王",
		Age:   500,
		Score: 90.9,
 		Sex:   "男",
	}
	TestStruct(a)
}
```

## 2. 使用反射的方式来获取结构体的tag标签，遍历字段的值，修改字段值，调用结构体方法，需要通过传递地址的方式完成

```go
package main

import (
	"encoding/json"
	"fmt"
	"reflect"
)

// 定义一个Monster结构体
type Monster struct {
	Name string `json:"name"`
	Age  int    `json:"monster_age"`
	Score float32	`json:"成绩"`
	Sex  string
}
//方法 显示s的值
func (s Monster) Print() {
	fmt.Println("---strat----")
	fmt.Println(s)
	fmt.Println("---end----")
}
// 方法 返回两个数的和
func (s Monster) GetSum(n1, n2 int) int {
	return n1 + n2
}
// 方法 修改Monster的值	
func (s Monster) Set(name string, age int, score float32, sex string) {
	s.Name = name
	s.Age = age
	s.Score = score
	s.Sex = sex
}

func TestStruct(a interface{}) {
	typ := reflect.TypeOf(a)
	val := reflect.ValueOf(a)
	kd := val.Kind()
	if kd != reflect.Struct {
		fmt.Println("a is not struct")
		return
	}
	// num := typ.NumField()
	num := val.Elem().NumField() // 获取结构体的字段个数
	val.Elem().Field(0).SetString("孙悟空")
	fmt.Printf("struct 有 %d 个字段\n", num)
	for i := 0; i < num; i++ {
		fmt.Printf("Field %d 的值为%v\n", i, val.Field(i))
		// 获取到struct标签，注意需要通过reflect.Type来获取
		tagVal := typ.Field(i).Tag.Get("json")
		if tagVal != "" {
			fmt.Printf("Field %d 的tag值为=%v\n", i, tagVal)
		}
	}
	fmt.Printf("struct has %d fields\n", num)
	numOfMethod := typ.NumMethod()
	fmt.Printf("struct has %d methods\n", numOfMethod)
	for i := 0; i < numOfMethod; i++ {
		fmt.Printf("第 %d 个方法名称为%v\n", i, typ.Method(i).Name)
	}

	// var params []reflect.Value
	// 这是因为在 Go 的反射机制中，Method(index) 调用时，方法的索引是按照方法名称的字母顺序来排序
	// 在这个 Monster 结构体中，方法按字母顺序排列为：
	// GetSum, Print, Set
	val.Method(1).Call(nil)
	// 调用结构体的第1个方法Method(0)
	var params []reflect.Value
	params = append(params, reflect.ValueOf(10))
	params = append(params, reflect.ValueOf(20))
	res := val.Method(0).Call(params) // 传入的参数是 []reflect.Value
	fmt.Printf("res=%d\n", res[0].Int()) // 返回结果，返回的结果是[]reflect.Value

}

func main() {
	var a Monster = Monster{
		Name:  "牛魔王",
		Age:   500,
		Score: 90.9,
 		Sex:   "男",
	}
	// Marshl就是通过反射获取到struct的tag值，然后进行序列化
	result, _ := json.Marshal(a)
	fmt.Println("json result:", string(result))
	TestStruct(&a)
	fmt.Println(a)
}
```

# 参考

1. [Golang标准库文档](https://studygolang.com/pkgdoc)
