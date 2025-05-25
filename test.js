function test(mark, output, expect, level) {
    if ( !isDeepEqual(output, expect) ) {
        console.log(mark, " - error - ", output, "-", expect);
        return;
    }
    if ( level && level > 0) {
        console.log(mark, " - pass");
    }
}

const isDeepEqual = (input1, input2) => {

    const isOjbects = isObject(input1) && isObject(input2);

    if ( !isOjbects ) return input1 == input2;
    
    const objKeys1 = Object.keys(input1);
    const objKeys2 = Object.keys(input2);

    if (objKeys1.length !== objKeys2.length) return false;

    for (let key of objKeys1) {
        const value1 = input1[key];
        const value2 = input2[key];

        if (( !isDeepEqual(value1, value2)) ) {
            return false;
        }
    }
    return true;
};

const isObject = (object) => {
    return object != null && typeof object === "object";
};