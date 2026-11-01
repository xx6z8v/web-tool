/* =========================================================
   C 语言速查 · 本地知识库 + 高级语法索引
   数据从 js/pages/c-cheatsheet.js 抽离而来
   ========================================================= */
window.CCheatsheetData = {

  /* =======================================================
     一、本地知识库
     ======================================================= */
  DATA: [
/* ---------- 基础结构 ---------- */
{
  c:'基础结构', t:'第一个 C 程序',
  d:'每个 C 程序都必须有一个 main 函数，程序从它开始执行，返回值 0 表示正常结束。',
  code:`#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}`,
  tags:['main','hello world','入口','基本结构']
},
{
  c:'基础结构', t:'头文件 #include',
  d:'尖括号用于系统标准库，双引号用于自己写的头文件（优先在当前目录查找）。',
  code:`#include <stdio.h>    // 标准输入输出
#include <string.h>   // 字符串函数
#include <stdlib.h>   // malloc / free 等
#include "myheader.h" // 自定义头文件`,
  tags:['include','头文件','预处理','库']
},
{
  c:'基础结构', t:'注释',
  d:'注释不参与编译。C99 起支持 // 单行注释，/* */ 可跨行但不能嵌套。',
  code:`// 单行注释

/* 多行注释
   可以跨越多行
   注意不能嵌套 */

int a = 1; // 行尾注释`,
  tags:['注释','comment','说明']
},
{
  c:'基础结构', t:'语句、代码块与标识符',
  d:'语句以分号结尾；花括号构成代码块和作用域；标识符区分大小写。',
  code:`int age = 18;      // 一条语句，以分号结束

{
    int x = 1;      // 花括号构成独立作用域
    // x 出了这个块就不能访问
}

// 合法标识符： count  _tmp  sum2  myVar
// 非法标识符： 2sum   int-value   (关键字不能用作名字)`,
  tags:['语句','代码块','标识符','分号','作用域']
},

/* ---------- 数据类型 ---------- */
{
  c:'数据类型', t:'基本数据类型',
  d:'C 的基本类型有整型、字符型、浮点型和无类型。具体字节数与平台相关。',
  code:`int     a = 10;       // 整型，通常 4 字节
char    c = 'A';      // 字符，1 字节
float   f = 3.14f;    // 单精度，4 字节
double  d = 3.14159;  // 双精度，8 字节
void    func(void);   // 无返回值 / 无参数

printf("%d %c %f %lf\\n", a, c, f, d);`,
  tags:['int','char','float','double','void','类型']
},
{
  c:'数据类型', t:'类型修饰符',
  d:'short / long / signed / unsigned 用来修饰基本类型，改变取值范围。',
  code:`short int s;          // 短整型，2 字节
long int l;             // 长整型
long long ll;           // 更长的整型

unsigned int u = 100;   // 无符号，只能存非负数
signed int n;           // 有符号（int 的默认）
unsigned char uc = 255; // 0 ~ 255

// 取值范围宏在 <limits.h> 中
printf("%d\\n", INT_MAX);`,
  tags:['unsigned','signed','short','long','修饰符','范围']
},
{
  c:'数据类型', t:'sizeof 运算符',
  d:'sizeof 返回类型或变量占用的字节数，常用来求数组长度。',
  code:`printf("%zu\\n", sizeof(int));     // 4
printf("%zu\\n", sizeof(double));  // 8

int arr[10];
int len = sizeof(arr) / sizeof(arr[0]);  // 10

// 注意：数组传参后退化为指针，sizeof 结果会变
void f(int arr[]) { sizeof(arr); }  // 指针大小，不是数组大小`,
  tags:['sizeof','长度','字节','数组长度']
},

/* ---------- 变量常量 ---------- */
{
  c:'变量常量', t:'变量定义与初始化',
  d:'C 要求变量先声明后使用。局部变量不初始化时值是随机的，务必手动初始化。',
  code:`int a;              // 声明（值不确定）
int b = 10;         // 定义并初始化
int x = 1, y = 2;   // 一行定义多个

a = 5;              // 赋值
a += 1;             // 复合赋值 → 6

int arr[3] = {0};   // 全部初始化为 0`,
  tags:['变量','定义','初始化','赋值']
},
{
  c:'变量常量', t:'const 常量',
  d:'const 修饰的变量只能初始化一次，之后不能修改，编译器会检查。',
  code:`const double PI = 3.14159;
// PI = 3.14;   // 编译错误

const int SIZE = 10;
int arr[SIZE];          // 可用于数组长度

const char *msg = "hi"; // 指针指向的内容不可改
char * const p = buf;   // 指针本身不可改`,
  tags:['const','常量','只读','限定符']
},

/* ---------- 运算符 ---------- */
{
  c:'运算符', t:'算术运算符',
  d:'整数除法会舍去小数部分，取余 % 只能用于整数。',
  code:`int a = 7, b = 2;

a + b;    // 9
a - b;    // 5
a * b;    // 14
a / b;    // 3   ← 整数除法，舍去小数
a % b;    // 1   ← 取余，仅限整数

7.0 / 2;  // 3.5 ← 有浮点数参与则为浮点除法
-a;       // 取负`,
  tags:['算术','加减乘除','取余','除法','运算符']
},
{
  c:'运算符', t:'关系与逻辑运算符',
  d:'关系运算结果为 0（假）或 1（真）。逻辑运算有短路特性。',
  code:`a == b    // 等于（注意是两个 =）
a != b    // 不等于
a > b     // 大于
a < b     // 小于
a >= b    // 大于等于
a <= b    // 小于等于

&&        // 逻辑与，两边都真才真
||        // 逻辑或，一边真即真
!         // 逻辑非

if (age >= 18 && age < 60) {
    printf("劳动年龄\\n");
}`,
  tags:['关系','逻辑','等于','与或非','判断','运算符']
},
{
  c:'运算符', t:'赋值与自增自减',
  d:'++i 先自增再取值；i++ 先取值再自增。',
  code:`int a = 5;
a += 3;    // a = 8
a -= 1;    // a = 7
a *= 2;    // a = 14
a /= 7;    // a = 2
a %= 2;    // a = 0
a <<= 1;   // 左移赋值
a &= 0xF;  // 按位与赋值

int i = 1;
int x = i++;   // x = 1, i = 2  （后置）
int y = ++i;   // y = 3, i = 3  （前置）`,
  tags:['赋值','自增','自减','++','--','运算符']
},
{
  c:'运算符', t:'位运算符',
  d:'直接对二进制位操作，常用于标志位、掩码和底层编程。',
  code:`unsigned char a = 0x0C;  // 0000 1100 = 12
unsigned char b = 0x0A;  // 0000 1010 = 10

a & b;   // 0000 1000 = 8    按位与
a | b;   // 0000 1110 = 14   按位或
a ^ b;   // 0000 0110 = 6    按位异或
~a;      // 按位取反
a << 2;  // 0011 0000 = 48   左移（相当于 ×4）
a >> 1;  // 0000 0110 = 6    右移（相当于 ÷2）`,
  tags:['位运算','与或非','移位','异或','二进制']
},
{
  c:'运算符', t:'三目运算符 ?:',
  d:'唯一的三元运算符，条件为真取前者，否则取后者。',
  code:`int max = (a > b) ? a : b;
int abs = (n < 0) ? -n : n;

// 等价于
int max;
if (a > b) max = a;
else       max = b;

// 嵌套（可读性差，慎用）
const char *s = (n > 0) ? "正" : (n < 0) ? "负" : "零";`,
  tags:['三目','三元','条件运算符','?:']
},
{
  c:'运算符', t:'类型转换',
  d:'隐式转换按 char→short→int→float→double 提升；显式转换用 (类型) 强制。',
  code:`int a = 10, b = 3;
double r = (double)a / b;   // 显式转换 → 3.3333
int q = a / b;              // 未转换 → 3

// 隐式转换（自动提升）
double d = 5;         // int → double
int i = 3.99;         // double → int，截断为 3

// 指针转换
void *p = &a;
int *ip = (int *)p;`,
  tags:['类型转换','强制转换','cast','隐式转换']
},

/* ---------- 控制流程 ---------- */
{
  c:'控制流程', t:'if / else if / else',
  d:'条件分支。条件表达式为 0 视为假，非 0 视为真。',
  code:`int score = 85;

if (score >= 90) {
    printf("A\\n");
} else if (score >= 60) {
    printf("及格\\n");
} else {
    printf("不及格\\n");
}

// 单条语句可省略花括号，但建议始终加上
if (x) printf("非零\\n");`,
  tags:['if','else','条件','分支','判断']
},
{
  c:'控制流程', t:'switch / case',
  d:'多分支选择，case 后必须是整型常量。忘记 break 会发生「贯穿」。',
  code:`switch (op) {
    case '+':
        result = a + b;
        break;              // 跳出 switch
    case '-':
        result = a - b;
        break;
    case '*':
    case 'x':               // 多个 case 共用一段代码
        result = a * b;
        break;
    default:
        printf("未知运算符\\n");
        break;
}`,
  tags:['switch','case','default','break','多分支']
},
{
  c:'控制流程', t:'for 循环',
  d:'适合次数已知的循环，三部分：初始化、条件、迭代。',
  code:`for (int i = 0; i < 10; i++) {
    printf("%d ", i);
}

// 遍历数组
int arr[] = {1, 2, 3, 4, 5};
int n = sizeof(arr) / sizeof(arr[0]);
for (int i = 0; i < n; i++) {
    printf("%d ", arr[i]);
}

// 无限循环
for (;;) { /* ... */ }`,
  tags:['for','循环','遍历','迭代']
},
{
  c:'控制流程', t:'while 循环',
  d:'先判断条件，再执行循环体，可能一次都不执行。',
  code:`int i = 0;
while (i < 5) {
    printf("%d ", i);
    i++;
}

// 读取到文件结束
int c;
while ((c = getchar()) != EOF) {
    putchar(c);
}`,
  tags:['while','循环','条件循环']
},
{
  c:'控制流程', t:'do...while 循环',
  d:'先执行一次循环体再判断条件，至少执行一次。结尾别忘了分号。',
  code:`int i = 0;
do {
    printf("%d ", i);
    i++;
} while (i < 5);   // ← 注意这里的分号

// 常用于「先执行再检查」的场景
int n;
do {
    printf("请输入正数：");
    scanf("%d", &n);
} while (n <= 0);`,
  tags:['do while','循环','至少一次']
},
{
  c:'控制流程', t:'break / continue',
  d:'break 结束整个循环或 switch；continue 只跳过本次，进入下一次循环。',
  code:`for (int i = 0; i < 10; i++) {
    if (i == 3) continue;  // 跳过 3，继续下一轮
    if (i == 8) break;     // 到 8 直接结束整个循环
    printf("%d ", i);      // 输出 0 1 2 4 5 6 7
}`,
  tags:['break','continue','跳出','跳过']
},
{
  c:'控制流程', t:'goto 语句',
  d:'无条件跳转到同函数内的标号，可跳出多层循环，但会破坏结构，慎用。',
  code:`for (int i = 0; i < 10; i++) {
    for (int j = 0; j < 10; j++) {
        if (i * j == 20) goto done;
    }
}
done:
    printf("已跳出多层循环\\n");`,
  tags:['goto','跳转','标号','多层循环']
},

/* ---------- 函数 ---------- */
{
  c:'函数', t:'函数定义与调用',
  d:'格式：返回类型 函数名(参数列表) { 函数体 }。无返回值用 void。',
  code:`int add(int a, int b) {     // 定义
    return a + b;
}

void say_hello(void) {      // 无参数无返回值
    printf("hello\\n");
}

int main(void) {
    int s = add(3, 4);      // 调用 → 7
    say_hello();
    return 0;
}`,
  tags:['函数','定义','调用','参数','返回值']
},
{
  c:'函数', t:'函数声明（原型）',
  d:'调用前必须先声明。把原型放在文件顶部或头文件里，定义可以写在后面。',
  code:`#include <stdio.h>

int add(int a, int b);   // 函数原型 / 声明

int main(void) {
    printf("%d\\n", add(1, 2));
    return 0;
}

int add(int a, int b) {  // 函数定义
    return a + b;
}`,
  tags:['函数声明','原型','prototype','前置声明']
},
{
  c:'函数', t:'递归',
  d:'函数调用自身。必须要有递归出口，否则会栈溢出。',
  code:`long long factorial(int n) {
    if (n <= 1) return 1;        // 递归出口
    return n * factorial(n - 1); // 递归调用
}

// factorial(5) = 120

int fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}`,
  tags:['递归','factorial','阶乘','斐波那契']
},
{
  c:'函数', t:'参数传递（值传递）',
  d:'C 只有值传递。想修改实参必须传地址（指针）。',
  code:`void swap_wrong(int a, int b) {
    int t = a; a = b; b = t;   // 只交换副本，无效
}

void swap(int *a, int *b) {    // 传地址才能改实参
    int t = *a;
    *a = *b;
    *b = t;
}

int x = 1, y = 2;
swap(&x, &y);   // x = 2, y = 1`,
  tags:['参数','值传递','地址传递','swap','指针']
},

/* ---------- 数组与字符串 ---------- */
{
  c:'数组与字符串', t:'一维数组',
  d:'下标从 0 开始，长度固定，不能整体赋值，越界不会报错但很危险。',
  code:`int arr[5];                     // 声明，值为随机
int a[5] = {1, 2, 3, 4, 5};     // 全部初始化
int b[5] = {1, 2};              // 其余元素自动为 0
int c[]  = {1, 2, 3};           // 长度自动推导为 3

int n = sizeof(c) / sizeof(c[0]);

a[0] = 100;                     // 修改第一个元素
printf("%d\\n", a[4]);          // 最后一个元素`,
  tags:['数组','一维数组','下标','初始化','长度']
},
{
  c:'数组与字符串', t:'二维数组',
  d:'按行存储，声明为 arr[行][列]，遍历通常用嵌套循环。',
  code:`int m[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};

m[1][2];   // 6
m[0][0];   // 1

for (int i = 0; i < 2; i++) {
    for (int j = 0; j < 3; j++) {
        printf("%d ", m[i][j]);
    }
    printf("\\n");
}`,
  tags:['二维数组','矩阵','行列','嵌套循环']
},
{
  c:'数组与字符串', t:'字符串',
  d:'C 没有字符串类型，用 char 数组表示，以 \'\\0\' 结尾。',
  code:`char s1[] = "hello";        // 长度 6（含 '\\0'）
char s2[6] = {'h','e','l','l','o','\\0'};
char *s3 = "hello";         // 字符串字面量，内容只读

printf("%s\\n", s1);
printf("%c\\n", s1[0]);     // 'h'
printf("%zu\\n", strlen(s1)); // 5（不含 '\\0'）

// s3[0] = 'H';  // 未定义行为，字面量不可修改`,
  tags:['字符串','char','结束符','\\0','字面量']
},
{
  c:'数组与字符串', t:'字符串函数 string.h',
  d:'常用：strlen / strcpy / strcat / strcmp。注意目标缓冲区要足够大。',
  code:`#include <string.h>

char dst[32];

strcpy(dst, "hello");            // 复制（不检查越界）
strncpy(dst, "hello", 31);       // 限长复制，更安全
dst[31] = '\\0';

char cat[64] = "foo";
strcat(cat, "bar");              // 拼接 → "foobar"

strlen("abc");                   // 3
strcmp("abc", "abd");            // <0，表示 abc 小于 abd
strcmp("abc", "abc");            // 0，相等

char *p = strchr("hello", 'l');  // 首次出现的地址
char *q = strstr("hello", "ll"); // 子串位置`,
  tags:['strlen','strcpy','strcat','strcmp','string.h','字符串函数']
},

/* ---------- 指针 ---------- */
{
  c:'指针', t:'指针基础',
  d:'指针保存变量的地址。& 取地址，* 解引用。未初始化的指针不要使用。',
  code:`int a = 10;
int *p = &a;          // p 指向 a

printf("%p\\n", (void *)p);  // a 的地址
printf("%d\\n", *p);         // 10，解引用

*p = 20;              // 通过指针修改 a
printf("%d\\n", a);   // 20

int *q = NULL;        // 空指针，使用前要判空
if (q != NULL) { /* ... */ }`,
  tags:['指针','地址','&','解引用','NULL']
},
{
  c:'指针', t:'指针与数组',
  d:'数组名在大多数场合会退化为首元素地址，可以用指针遍历数组。',
  code:`int arr[5] = {10, 20, 30, 40, 50};
int *p = arr;          // 等价于 &arr[0]

*p;         // 10
*(p + 1);   // 20
p[2];       // 30，等价于 *(p + 2)

for (int i = 0; i < 5; i++) {
    printf("%d ", *(p + i));
}

// 指针相减得到元素个数
int cnt = &arr[4] - &arr[0];   // 4`,
  tags:['指针','数组','退化','指针运算','遍历']
},
{
  c:'指针', t:'指针作函数参数',
  d:'传地址可以让函数修改调用者的变量，也避免大结构体的拷贝开销。',
  code:`void fill(int *arr, int n, int val) {
    for (int i = 0; i < n; i++)
        arr[i] = val;
}

void get_min_max(int *arr, int n, int *min, int *max) {
    *min = *max = arr[0];
    for (int i = 1; i < n; i++) {
        if (arr[i] < *min) *min = arr[i];
        if (arr[i] > *max) *max = arr[i];
    }
}

int lo, hi;
get_min_max(arr, n, &lo, &hi);   // 通过指针带回结果`,
  tags:['指针参数','输出参数','地址传递','函数']
},
{
  c:'指针', t:'函数指针',
  d:'指向函数的指针，可用于回调、策略表、简化分支。',
  code:`int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

int (*op)(int, int) = add;   // 声明并赋值
op(3, 4);                    // 7
op = sub;
op(3, 4);                    // -1

// 作为参数（回调函数）
void apply(int (*f)(int, int), int a, int b) {
    printf("%d\\n", f(a, b));
}
apply(add, 1, 2);`,
  tags:['函数指针','回调','callback','typedef']
},
{
  c:'指针', t:'动态内存 malloc / free',
  d:'在堆上分配内存，用完必须 free，否则内存泄漏。free 后把指针置 NULL。',
  code:`#include <stdlib.h>

int *p = (int *)malloc(10 * sizeof(int));
if (p == NULL) {
    printf("内存分配失败\\n");
    return 1;
}

for (int i = 0; i < 10; i++) p[i] = i;

free(p);      // 必须释放
p = NULL;     // 避免野指针

// calloc 会初始化为 0
int *q = (int *)calloc(10, sizeof(int));

// realloc 调整大小
q = (int *)realloc(q, 20 * sizeof(int));
free(q);`,
  tags:['malloc','free','calloc','realloc','动态内存','堆']
},

/* ---------- 结构体 ---------- */
{
  c:'结构体', t:'struct 结构体',
  d:'把多个不同类型的数据组合成一个整体，成员用 . 访问。',
  code:`struct Student {
    char name[20];
    int  age;
    float score;
};

struct Student s1 = {"小明", 18, 92.5};
s1.age = 19;
printf("%s %d\\n", s1.name, s1.age);

struct Student s2;
s2 = s1;              // 结构体可以整体赋值

// 指定初始化（C99）
struct Student s3 = {.name = "小红", .age = 17};`,
  tags:['struct','结构体','成员','点运算符','初始化']
},
{
  c:'结构体', t:'typedef 起别名',
  d:'typedef 为已有类型取新名字，最常用于简化结构体声明。',
  code:`typedef struct {
    int x;
    int y;
} Point;

Point p = {1, 2};
p.x = 10;

// 也可以给基本类型起别名
typedef unsigned int uint;
uint n = 100;

// 给指针起别名
typedef char *string;
string s = "hi";`,
  tags:['typedef','别名','结构体','简化']
},
{
  c:'结构体', t:'结构体指针与 -> 运算符',
  d:'p->member 是 (*p).member 的简写，处理结构体时几乎都用它。',
  code:`typedef struct { int x, y; } Point;

Point p = {1, 2};
Point *pp = &p;

(*pp).x;      // 1
pp->x;        // 1，等价写法，更常用

pp->x = 5;
printf("%d\\n", p.x);   // 5

// 链表节点的经典写法
typedef struct Node {
    int data;
    struct Node *next;   // 注意这里必须写 struct Node
} Node;`,
  tags:['结构体指针','箭头','->','链表','typedef']
},
{
  c:'结构体', t:'enum 枚举',
  d:'为一组整型常量命名，默认从 0 开始递增，也可以手动指定。',
  code:`enum Color { RED, GREEN, BLUE };        // 0, 1, 2
enum Status { OK = 0, ERR = -1, BUSY = 2 };

enum Color c = GREEN;
printf("%d\\n", c);      // 1

if (c == GREEN) {
    printf("绿色\\n");
}

// 常配合 switch 使用
switch (c) {
    case RED:   printf("红\\n"); break;
    case GREEN: printf("绿\\n"); break;
    default:    break;
}`,
  tags:['enum','枚举','常量','switch']
},
{
  c:'结构体', t:'union 共用体',
  d:'所有成员共用同一块内存，同一时刻只能有效使用一个成员，大小为最大成员大小。',
  code:`union Data {
    int   i;
    float f;
    char  str[20];
};

union Data d;
d.i = 10;
printf("%d\\n", d.i);

d.f = 3.14;      // 此时 i 的值被覆盖
printf("%zu\\n", sizeof(union Data));  // 20

// 常用于节省内存或类型双关（type punning）`,
  tags:['union','共用体','内存','类型双关']
},

/* ---------- 预处理 ---------- */
{
  c:'预处理', t:'#define 宏',
  d:'宏是纯文本替换，不做类型检查。带参数的宏，每个参数和整体都要加括号。',
  code:`#define PI 3.14159
#define MAX(a, b)  ((a) > (b) ? (a) : (b))
#define SQUARE(x)  ((x) * (x))

double area = PI * r * r;
int m = MAX(3, 5);      // 5

// 危险示例：不加括号会出错
#define BAD(x)  x * x
BAD(1 + 2);             // 展开为 1 + 2 * 1 + 2 = 5，而非 9

#undef PI               // 取消宏定义`,
  tags:['define','宏','预处理','替换','MAX']
},
{
  c:'预处理', t:'条件编译',
  d:'根据宏是否定义来决定是否编译某段代码，常用于调试开关和跨平台。',
  code:`#define DEBUG 1

#ifdef DEBUG
    printf("调试信息\\n");
#endif

#ifndef VERSION
#define VERSION "1.0"
#endif

#if __STDC_VERSION__ >= 199901L
    // C99 及以上才编译
#endif

#if 0
    // 这段代码不会被编译，常用于临时屏蔽
#endif`,
  tags:['条件编译','ifdef','ifndef','endif','调试']
},
{
  c:'预处理', t:'头文件保护',
  d:'防止头文件被重复包含导致重定义。现代编译器也支持 #pragma once。',
  code:`// myheader.h
#ifndef MYHEADER_H
#define MYHEADER_H

struct Point { int x, y; };
int add(int a, int b);

#endif  // MYHEADER_H

// ---------- 或者更简洁 ----------
#pragma once

struct Point { int x, y; };`,
  tags:['头文件保护','ifndef','pragma once','重复包含']
},

/* ---------- 输入输出 ---------- */
{
  c:'输入输出', t:'printf 格式化输出',
  d:'常用格式符：%d %u %ld %f %lf %c %s %p %x %o。',
  code:`printf("%d\\n", 42);          // int
printf("%u\\n", 42u);         // unsigned
printf("%ld\\n", 42L);        // long
printf("%f\\n", 3.14);        // double，默认 6 位小数
printf("%.2f\\n", 3.14159);   // 保留 2 位 → 3.14
printf("%c\\n", 'A');         // 字符
printf("%s\\n", "hello");     // 字符串
printf("%p\\n", (void *)&a);  // 地址
printf("%x\\n", 255);         // 十六进制 → ff
printf("%o\\n", 8);           // 八进制 → 10

printf("%5d|\\n", 42);        // 宽 5 右对齐 → "   42|"
printf("%-5d|\\n", 42);       // 左对齐     → "42   |"
printf("%05d\\n", 42);        // 补零       → 00042
printf("%%\\n");              // 输出 %`,
  tags:['printf','格式化','输出','%d','占位符']
},
{
  c:'输入输出', t:'scanf 格式化输入',
  d:'变量前必须加 &（字符串数组除外）。返回成功读入的项数，可用于判断输入是否合法。',
  code:`int age;
printf("请输入年龄：");
scanf("%d", &age);          // ← 别忘了 &

float f;
scanf("%f", &f);

char name[20];
scanf("%19s", name);        // 字符串不加 &，限制长度防溢出

int a, b;
int n = scanf("%d %d", &a, &b);
if (n != 2) {
    printf("输入错误\\n");
}

// 清空缓冲区残留的换行符
int c;
while ((c = getchar()) != '\\n' && c != EOF) { }`,
  tags:['scanf','输入','&','返回值','缓冲区']
},
{
  c:'输入输出', t:'getchar / putchar',
  d:'按字符读写，getchar 返回 int 便于判断 EOF。',
  code:`int ch = getchar();   // 读一个字符，失败返回 EOF
putchar('A');
putchar('\\n');

// 循环读取直到文件结束
int c;
while ((c = getchar()) != EOF) {
    putchar(c);
}

// 统计字符数
int count = 0;
while (getchar() != '\\n') count++;`,
  tags:['getchar','putchar','字符','EOF','输入']
},
{
  c:'输入输出', t:'文件读写',
  d:'用 FILE* 操作文件，打开后必须关闭。模式：r 读 / w 写（清空）/ a 追加 / 加 b 为二进制。',
  code:`#include <stdio.h>

FILE *fp = fopen("data.txt", "r");
if (fp == NULL) {
    perror("打开失败");
    return 1;
}

char buf[256];
while (fgets(buf, sizeof(buf), fp) != NULL) {
    printf("%s", buf);
}
fclose(fp);

// ---------- 写入 ----------
FILE *out = fopen("out.txt", "w");
if (out) {
    fprintf(out, "hello %d\\n", 42);
    fputs("world\\n", out);
    fputc('!', out);
    fclose(out);
}`,
  tags:['文件','fopen','fclose','fgets','fprintf','FILE']
},

/* ---------- 常用库 ---------- */
{
  c:'常用库', t:'stdlib.h 常用函数',
  d:'类型转换、随机数、内存管理、排序、程序退出等。',
  code:`#include <stdlib.h>
#include <time.h>

int n = atoi("123");            // 字符串 → int
double d = atof("3.14");        // 字符串 → double
long l = strtol("ff", NULL, 16);// 按 16 进制解析

srand((unsigned)time(NULL));    // 用时间播种
int r = rand() % 100;           // 0 ~ 99

void *p = malloc(100);
free(p);

exit(0);                        // 结束程序
abs(-5);                        // 绝对值

// 快速排序（需自定义比较函数）
int cmp(const void *a, const void *b) {
    return *(int *)a - *(int *)b;
}
qsort(arr, n, sizeof(int), cmp);`,
  tags:['stdlib','atoi','rand','qsort','exit','排序']
},
{
  c:'常用库', t:'math.h 常用函数',
  d:'数学函数库，注意部分平台上编译需链接数学库（gcc 加 -lm）。',
  code:`#include <math.h>

double x = sqrt(16.0);        // 4.0   开平方
double y = pow(2, 10);        // 1024  幂
double z = fabs(-3.5);        // 3.5   绝对值
double s = sin(3.14159 / 2);  // 1.0   正弦
double c = cos(0);            // 1.0
double f = floor(3.7);        // 3.0   向下取整
double g = ceil(3.2);         // 4.0   向上取整
double r = round(3.5);        // 4.0   四舍五入
double m = fmod(7.5, 2);      // 1.5   浮点取余

// gcc main.c -lm`,
  tags:['math.h','sqrt','pow','fabs','三角函数','数学']
}
  ],

  /* =======================================================
     二、高级语法索引（命中后提供外部搜索）
     ======================================================= */
  ADV: [
  { t:'可变参数 va_list',            c:'函数',      k:'va_list va_start va_arg va_end vsnprintf 可变参数函数' },
  { t:'可变参数宏 __VA_ARGS__',      c:'预处理',    k:'__VA_ARGS__ 可变参数宏 宏重载' },
  { t:'内联函数 inline',             c:'函数',      k:'inline always_inline 内联 函数优化' },
  { t:'函数指针数组与状态机',         c:'函数',      k:'函数指针数组 回调表 状态机 dispatch table' },
  { t:'尾递归与递归优化',             c:'函数',      k:'尾递归 递归优化 栈溢出' },
  { t:'多级指针（二级指针）',         c:'指针',      k:'二级指针 多级指针 int** 指针的指针' },
  { t:'const 与指针的组合',          c:'指针',      k:'const 指针 常量指针 指针常量 const int* int* const' },
  { t:'restrict 限定符',             c:'指针',      k:'restrict 限定符 指针别名 编译器优化' },
  { t:'指针与数组的区别',             c:'指针',      k:'指针 数组 退化 decay sizeof 区别' },
  { t:'void* 通用指针',              c:'指针',      k:'void* 通用指针 类型转换 泛型' },
  { t:'位域 bit-field',              c:'数据类型',  k:'位域 bitfield 位段 紧凑存储 二进制协议' },
  { t:'柔性数组成员',                c:'数据类型',  k:'柔性数组 flexible array member char data[] 变长结构体' },
  { t:'_Generic 泛型选择',           c:'数据类型',  k:'_Generic 泛型 C11 类型分派 宏' },
  { t:'_Static_assert 静态断言',     c:'数据类型',  k:'_Static_assert static_assert 编译期断言' },
  { t:'复合字面量',                  c:'数据类型',  k:'复合字面量 compound literal 匿名对象' },
  { t:'变长数组 VLA',                c:'数据类型',  k:'变长数组 VLA variable length array C99' },
  { t:'匿名结构体与联合体',           c:'结构体',    k:'匿名结构体 匿名联合体 anonymous struct union' },
  { t:'inttypes.h 格式化宏',         c:'数据类型',  k:'inttypes.h PRIu64 PRId32 可移植 格式化' },
  { t:'内存对齐 _Alignas / alignof', c:'内存管理',  k:'内存对齐 alignas alignof 结构体填充 padding' },
  { t:'字节序与大小端',              c:'内存管理',  k:'字节序 大小端 endian htonl ntohl 网络序' },
  { t:'memcpy 与 memmove 的区别',    c:'内存管理',  k:'memcpy memmove 内存重叠 拷贝' },
  { t:'memset 常见陷阱',             c:'内存管理',  k:'memset 陷阱 逐字节填充 初始化' },
  { t:'offsetof 宏',                 c:'结构体',    k:'offsetof 成员偏移 stddef.h 容器宏' },
  { t:'内存池与对象池',              c:'内存管理',  k:'内存池 对象池 池化 分配器 性能优化' },
  { t:'野指针与悬垂指针',            c:'内存管理',  k:'野指针 悬垂指针 内存泄漏 未定义行为' },
  { t:'位操作技巧与掩码',            c:'运算符',    k:'位操作 位掩码 置位 清零 取反 位技巧' },
  { t:'# 字符串化与 ## 连接',        c:'预处理',    k:'井号 字符串化 记号连接 token paste 宏' },
  { t:'X Macro 技巧',                c:'预处理',    k:'X Macro X-Macro 宏列表 代码生成' },
  { t:'预定义宏 __FILE__ __LINE__',  c:'预处理',    k:'__FILE__ __LINE__ __func__ __DATE__ __TIME__' },
  { t:'__attribute__ 扩展',          c:'预处理',    k:'__attribute__ packed aligned unused constructor GCC 扩展' },
  { t:'volatile 关键字',             c:'底层与调试', k:'volatile 易变 编译器优化 硬件寄存器' },
  { t:'内联汇编 asm',                c:'底层与调试', k:'内联汇编 asm __asm__ 汇编 寄存器' },
  { t:'setjmp / longjmp 非局部跳转', c:'底层与调试', k:'setjmp longjmp 非局部跳转 异常处理' },
  { t:'信号处理 signal / sigaction', c:'底层与调试', k:'signal sigaction 信号 SIGINT 异步处理' },
  { t:'命令行参数与 getopt',         c:'底层与调试', k:'argc argv getopt getopt_long 命令行参数解析' },
  { t:'pthread 线程基础',            c:'并发多线程', k:'pthread_create pthread_join 线程 POSIX 多线程' },
  { t:'互斥锁与条件变量',            c:'并发多线程', k:'mutex pthread_mutex_lock 条件变量 condition variable 同步' },
  { t:'C11 原子操作 stdatomic',      c:'并发多线程', k:'stdatomic atomic_load atomic_store 原子操作 内存序' },
  { t:'C11 线程库 threads.h',        c:'并发多线程', k:'threads.h thrd_create 线程 C11' },
  { t:'线程局部存储 _Thread_local',  c:'并发多线程', k:'_Thread_local thread_local TLS 线程局部' },
  { t:'strtok_r 线程安全分词',       c:'常用库',    k:'strtok strtok_r 字符串分割 分词 线程安全' },
  { t:'bsearch 二分查找',            c:'常用库',    k:'bsearch 二分查找 有序数组 标准库' },
  { t:'errno 与 perror 错误处理',    c:'常用库',    k:'errno perror strerror 错误码 错误处理' },
  { t:'assert 断言',                 c:'常用库',    k:'assert 断言 NDEBUG 调试 检查' },
  { t:'时间函数 time / strftime',    c:'常用库',    k:'time localtime strftime 时间格式化 时间戳' },
  { t:'目录遍历 dirent',             c:'常用库',    k:'dirent opendir readdir 目录遍历 文件系统' },
  { t:'环境变量 getenv',             c:'常用库',    k:'getenv setenv 环境变量 environ 配置' },
  { t:'extern "C" 与 C++ 混合编译',  c:'工程实践',  k:'extern "C" C++ 混合编译 name mangling' },
  { t:'编译链接与静态/动态库',       c:'工程实践',  k:'编译 链接 静态库 动态库 gcc ar 共享库 so' },
  { t:'Makefile 与 CMake',           c:'工程实践',  k:'Makefile CMake 构建系统 编译 工程管理' },
  { t:'GDB 调试与 Valgrind',         c:'工程实践',  k:'gdb valgrind 调试 内存检测 断点 泄漏' },
  { t:'链表实现',                    c:'数据结构',  k:'链表 单链表 双向链表 节点 头插法' },
  { t:'二叉树与遍历',                c:'数据结构',  k:'二叉树 遍历 前序 中序 后序 递归' },
  { t:'哈希表实现',                  c:'数据结构',  k:'哈希表 hash table 散列 冲突 链地址法' },
  { t:'环形缓冲区 ring buffer',      c:'数据结构',  k:'环形缓冲区 循环队列 ring buffer 生产者消费者' },
  { t:'状态机实现',                  c:'数据结构',  k:'状态机 有限状态机 FSM 表驱动 状态转移' }
  ]

};