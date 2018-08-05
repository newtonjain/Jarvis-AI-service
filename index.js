var httpRequest = require('request');
var cheerio = require('cheerio');
var rp = require('request-promise');
var express = require('express')

// Set up a standard Express app
var app = express();
  var res = {send: function(){return}};
 app.listen(process.env.PORT || 3000);   
 app.get('/hello', function(req, resp) {
 var question = req.query.q;
 var answer;
 var sources = [];
 var myFirstPromise;
 var reject;
  if(req.query.q)
    {
        myFirstPromise = new Promise(function(resolve, reject) {
         process(question, resolve, reject);

        });
    
    myFirstPromise.then(function(result){
        console.log('HERE IS THE RETURN', result);
        resp.send(result);
    }).catch(function (data) {
        console.log("Promise REJECTED ", data);
    });     

    }
    else
    {
        res.send('ERROR OCCURED');
    }



var hash = {}
function fuzzy_match(str,pattern){

    if (hash.hasOwnProperty(str))
    {
        return hash[str];
    }
    str = str.toLowerCase();
    pattern = pattern.toLowerCase();
    pattern = pattern.split("").reduce(function(a,b){ return a+".*"+b; });
    return hash[str] = (new RegExp(pattern)).test(str);
};

function unique(arr) {
    var hash = {}, result = [];
    for ( var i = 0, l = arr.length; i < l; ++i ) {
        if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
            hash[ arr[i] ] = true;
            result.push(arr[i]);
        }
    }
    return result;
}

function GetAutoCompleteResultBing(sentence)
{
    return RequestInfo("https://api.cognitive.microsoft.com/bing/v7.0/suggestions/?q="+sentence,
        "b8c5340f414d4f7ab5d72c2d806062b8")
        .then(
            function(result){
                var suggestions = []
                if(result){
                result.suggestionGroups[0].searchSuggestions.forEach(function(entry) {
                    suggestions.push(entry.displayText);
                });
                }
                return suggestions;
            }
        );
}

function GetAutoCompleteResultGoogle(sentence)
{
    return RequestInfo("http://suggestqueries.google.com/complete/search?client=firefox&q="+sentence, null)
    .then(
            function(result){
                return result[1];
            }
        );;
}

function compareStrings (string1, string2, ignoreCase, useLocale) {
    if (ignoreCase) {
        if (useLocale) {
            string1 = string1.toLocaleLowerCase();
            string2 = string2.toLocaleLowerCase();
        }
        else {
            string1 = string1.toLowerCase();
            string2 = string2.toLowerCase();
        }
    }

    return string1 === string2;
}

function RequestInfo(url, key, json = true)
{
    var options = {
        uri: url,
        headers: {
            'Ocp-Apim-Subscription-Key': key
        }
    };

    return rp(options)
        .then(function (repos) {
            if(json)
            {
                return JSON.parse(repos);
            }
            else{
                return repos;
            }
        })
        .catch(function (err) {
            // API call failed...
        });
}

////////////////////////////////////////////////////////////////////////

function pushing() {
sources.push(
function SuggestionGoogle(sentence)
{
    var suggestions = []
    return GetAutoCompleteResultGoogle(sentence).then(function(result){
        result.forEach(function(entry)
        {
            if(entry.length > sentence.length && compareStrings(sentence, entry.substring(0, sentence.length), true, false))
            {
                suggestions.push(entry)
            }
        });
        return suggestions;
    });
},
function SuggestionBing(sentence)
{
    var suggestions = []
    return GetAutoCompleteResultBing(sentence).then(function(result){
        result.forEach(function(entry)
        {
            if(entry.length > sentence.length && compareStrings(sentence, entry.substring(0, sentence.length), true, false))
            {
                suggestions.push(entry)
            }
        });
        return suggestions;
    });
},
function QueryGoogle(sentence)
{
    return RequestInfo("http://www.google.com/search?q="+sentence, null, false)
    .then(function(body)
    {
        var $ = cheerio.load(body);

        var suggestions = [];

        $('div.g').each(function(i, el) {
            suggestions.push($(el).find('span.st').text());
        });

        return suggestions;
    });
},
function QueryBing(sentence)
{
    return RequestInfo(
        "https://api.cognitive.microsoft.com/bing/v5.0/search?q="+sentence+"&count=10&offset=0&mkt=en-us&safesearch=Moderate",
        "fb3f0d379a2b405ab74e696ec33012c0")
        .then(function(result){
            var suggestions = []
            if(result){
            result.webPages.value.forEach(function(entry){
                if(entry.snippet != '')
                {
                    suggestions.push(entry.snippet)
                }
            })
            }
            return suggestions;
        });
}
)
}

function Looping(sentence, resolve)
{
    var results = []
    var thread_ended = 0
    console.log('in loop', sources.length)
    for(func in sources)
    {
        console.log("Loop", func);
        sources[func](sentence).then(function(result){
            results = results.concat(result);

            thread_ended++;
            if(thread_ended == sources.length)
            {
                console.log(results)
                results = postProcess(sentence, results);
                console.log(results)
                    console.log('here are the results', results);
                    resolve(results);
            }
        });
    }
    
}

function process(question, resolve) {
    var answer={};
    console.log('Re');
    pushing();
    var sentence = question;
    Looping(sentence, resolve);
};

function postProcess(sentence, results)
{
    var processed = []
    var bad = false;
    for(res in results)
    {
        bad = false;
        item = results[res];

        if(item.length == 0)
        {
            bad = true
        }

        if(!bad)
        {
            processed.push(item);
        }
    }

    processed.sort(function(item1, item2) {
        var val1 = fuzzy_match(item1, sentence);
        var val2 = fuzzy_match(item2, sentence);

        if (val1 == val2) return 0;
        if (val1 > val2) return -1;
        if (val1 < val2) return 1;
    });

    processed = unique(processed)
    return processed;
}



});


///////////////////////////////// Helpers ///////////////////////////////
