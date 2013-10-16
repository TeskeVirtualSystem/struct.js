         _                   _      _     
     ___| |_ _ __ _   _  ___| |_   (_)___ 
    / __| __| '__| | | |/ __| __|  | / __|
    \__ \ |_| |  | |_| | (__| |_ _ | \__ \
    |___/\__|_|   \__,_|\___|\__(_)/ |___/
                                 |__/     
Description
========

This is an implementation of Python Struct to Javascript.

The idea is to make an easy interface like python struct in javascript to parse strings as C Types.

What is done
========
*   Full unpack support. I implemented all types unpack from python struct
*   Big Endian and Little endian Support. You can choose the endianess like you do in python struct.

TODO
=======
*   Packing functions. 

How to use it
=======

In **python**, you use something like that for an int **1234**:

```python
import struct
data = '\xd2\x04\x00\x00'
struct.unpack("I", data)    #   This will return (1234,)
```
So in **struct.js** you will do basicly the same:
```javascript
var data = '\xd2\x04\x00\x00';
struct.unpack("I", data);   //   This will return [1234]
```

It works also for multiple packed data, in **python**:
```python
import struct
data = '\xe0#\x00\x00\x00\x00(Aa'
struct.unpack("Ifc", data)  #   This will return (9184, 10.5, 'a')
```

In **struct.js**:
```javascript
var data = '\xe0#\x00\x00\x00\x00(Aa';
struct.unpack("Ifc", data); //  This will return [9184, 10.5, "a"]
```

The function syntax:
=======

```javascript
struct.unpack(fmt, string)
```

Arguments: `fmt` a string containing the types and endianess:

First Character is endianess (Optional)
*   `@`	    Little Endian
*   `=`	    Little Endian
*   `<`	    Little Endian
*   `>`	    Big Endian
*   `!`	    Big Endian

First and/or other characters as the format:

*   Format - C Type - Size  -  Description
*   `x`	Pad Byte            -   1   -   This just skips one byte at the data
*   `c`	char                -	1   -   String of Length 1 
*   `b`	signed char	        -   1   -   Integer
*   `B`	unsigned char	    -   1   -   Integer
*   `?`	boolean             -   1   -   Boolean
*   `h`	short int           -   2   -   Int
*   `H`	unsigned short	    -   2   -   Integer
*   `i`	int	                -   4   -   Integer
*   `I`	unsigned int	    -   4   -   Integer
*   `l`	long	integer	    -   4	-   Integer
*   `L`	unsigned long	    -   4   -   Integer
*   `q`	long long           -   8   -   Integer
*   `Q`	unsigned long long	-   8   -   Integer
*   `f`	float	            -   4   -   Float
*   `d`	double	            -   8   -   Double
*   `s`	char[]	            -   ?   -   String 
*   `p`	char[]	            -   ?   -   String
*   `P`	void *              -   4   -   Integer

Returns : array with the elements
