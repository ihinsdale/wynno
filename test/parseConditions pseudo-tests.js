
    console.log('LINKS');
    var test = [{type:'link'}];
    console.log(parseConditions(test));
    test = [{type:'link'}, {type:'link'}]
    console.log(parseConditions(test));
    test = [{type:'link',link:'nyr.kr'}]
    console.log(parseConditions(test));
    test = [{type:'link',link:'nyr.kr'}, {type:'link',link:'nytimes.com'}]
    console.log(parseConditions(test));
    test = [{type:'link',link:'nyr.kr'}, {type:'link',link:'nytimes.com'},{type:'link'}]
    console.log(parseConditions(test));
    test = [{type:'link',link:'nyr.kr'}, {type:'link',link:'nyr.kr'}]
    console.log(parseConditions(test));
    test = [{type:'link',link:'nyr.kr'}, {type:'link',link:'nyr.kr'}, {type:'link',link:'nytimes.com'}, {type:'link',link:'nytimes.com'}, {type:'link'}]
    console.log(parseConditions(test));
    test = [{type:'link',link:'nyr.kr'}, {type:'link',link:'nyr.kr'}, {type:'link',link:'nytimes.com'}, {type:'link',link:'nytimes.com'}, {type:'link'}, {type:'link'}]
    console.log(parseConditions(test));
    

    console.log('WORDS');
    
    console.log('words only');
    var test =[{type:'word',word:'asdf'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'asdf'},{type:'word',word:'qwer'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'qwer'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'qwer'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'qwer'},{type:'word',word:'qwer'}]
    console.log(parseConditions(test));
    
    console.log('phrases only');
    var test =[{type:'word',word:'blah blah'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'blah blah'},{type:'word',word:'zeep zeep'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'blah blah'},{type:'word',word:'blah blah'},{type:'word',word:'zeep zeep'}]
    console.log(parseConditions(test));
    var test =[{type:'word',word:'blah blah'},{type:'word',word:'blah blah'},{type:'word',word:'blah blah'},{type:'word',word:'zeep zeep'}]
    console.log(parseConditions(test));
    
    console.log('words and phrases');
    var test =[{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'blah blah'},{type:'word',word:'blah blah'}];
    console.log(parseConditions(test));
    var test =[{type:'word',word:'asdf'},{type:'word',word:'asdf'},{type:'word',word:'bingo'},{type:'word',word:'blah blah'},{type:'word',word:'blah blah'}];
    console.log(parseConditions(test));
    */