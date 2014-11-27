fs = require('fs'),           // library to read files
_ = require('underscore');    // underscoreJS helper lib

/**
 * @desc Given an input string, tokenize it into an array of word tokens and strip unwanted strings like `Subject` or empty strings.
 * @param  {String} text
 * @return {Array} sanitized
 */
NaiveBayes.prototype.defaultTokenizer = function (text) {
  /*remove punctuation from text - remove anything that isn't a word char or a space*/ 
  var rgxPunctuation = /[^\w\s]/g; 
  var sanitized = text.replace(rgxPunctuation, ' '); 
  sanitized = sanitized.split(/\s+/);
  sanitized = sanitized.filter(function(n){ return n != 'Subject'&&n != ' '&&n != '' });
  return sanitized; 
}
/* 
 *  @desc Check if file is considered legit or spam and return true if legit, false if spam
 *  @param {String} filename
 *  @return {Boolean} fileIsLegit
 */
NaiveBayes.prototype.isLegit = function(filename){
  var legitRegEx = /.*legit.*/;
  return (filename.match(legitRegEx)!=null);
}
/* 
 *  @desc Learn a word instance and save accordingly to data matrix
 *  @param {String} word
 *  @param {Boolean} file legitStatus
 */
NaiveBayes.prototype.learnWord = function (word,legitStatus){
  if(typeof legitStatus !== 'boolean')
    throw new Error('NaiveBayes.learnWord: Not a valid status `'+legitStatus+'` for word: `'+word+'`.');
  if(word == '' || word == 'Subject' || word == ' ' )
    throw new Error('NaiveBayes.learnWord: Not a valid word to learn `'+word+'`.');   
  if(_.indexOf(this.vocabulary,word)==-1) this.initializeWord(word); // if word not in vocabulary add it
  if(legitStatus==true){
    this.theMatrix.words[word].legit++;
  }else{
    this.theMatrix.words[word].spam++;
  }
  this.theMatrix.words[word].total++;
}
/* 
 *  @desc Add a word to the dictionary with default count of 0.
 *  @param {String} word
 */
NaiveBayes.prototype.initializeWord = function(word){
  var w = {spam: 0, legit: 0, total:0};
  this.theMatrix.words[word] = w; 
  this.vocabulary.push(word);
}
/* 
 *  @desc Count the total of words in the dictionary and save it to the global matrix. 
 *  @note Breakdown is legit/spam/total 
 */
NaiveBayes.prototype.countWords = function(){

  this.theMatrix.messages.total = this.messagesCount;
  this.theMatrix.messages.legit = this.legitCount;
  this.theMatrix.messages.spam = this.spamCount;

  var spamOnly = _.groupBy(this.theMatrix.words,function(word){return word.spam>0 && word.legit==0;});
  var legitOnly = _.groupBy(this.theMatrix.words,function(word){return word.legit>0 && word.spam==0;});
  var spamLegit = _.groupBy(this.theMatrix.words,function(word){return word.legit>0 && word.spam>0;});

  spamOnly = spamOnly.true.length;
  legitOnly = legitOnly.true.length;
  spamLegit = spamLegit.true.length;

  console.log('\n === wordCount === \n');
  console.log('spamOnly '+spamOnly);
  console.log('legitOnly '+legitOnly);
  console.log('spamLegit '+spamLegit);

  this.theMatrix.wordCount.spam = spamOnly + spamLegit;
  this.theMatrix.wordCount.legit = legitOnly + spamLegit;
  this.theMatrix.wordCount.total = this.theMatrix.wordCount.spam+this.theMatrix.wordCount.legit;

 
}
/* 
 *  @desc Iterate over the words in a file and learn them.
 *  @param {String} filename
 */
NaiveBayes.prototype.learnFile = function (filename){
  var text = fs.readFileSync(this.dir+filename,{encoding:'utf8'});
  var arrayOfTexts = this.defaultTokenizer(text);
  for(i in arrayOfTexts){
      var spamCheck = this.isLegit(filename);
      this.learnWord(arrayOfTexts[i],spamCheck);
  }
}
/*
 *  @desc   Precalculate the following data: 
 *          
 *          a-priori distribution
 *          
 *            P(Spam) = CountWords(Spam) / CountWords(Total)
 *            P(Legit) = CountWords(Legit) / CountWords(Total)
 *          
 *          evidence distribution P(Evidence) = { P(word), ... }, where
 *            
 *            P(word) = CountWords(word) / CountWords(Total) 
 *          
 *          likelihood {P(Word1/Spam), P(Word1/Legit) ... }
 *          
 *            P(word/CATEGORY) = CountWords(word is CATEGORY) / CountWords(word in all CATEGORIES)
 *            
 */
NaiveBayes.prototype.preCalculateProbs = function(){
  var words = this.theMatrix.words,
      countAllWords = this.theMatrix.wordCount.total;
  /*   a-priori distribution {P(Spam), P(Legit)}  */
  var pSpam = this.theMatrix.wordCount.spam / countAllWords,
      pLegit = this.theMatrix.wordCount.legit / countAllWords;
  this.theMatrix.probability = { spam: pSpam, legit: pLegit };
  var pEvidence = {}, pLikelihood={};
  for(var n in words){
    
    /*   evidence distribution {P(word[1]),P(word[2]),..., P(word[n])}  */
    var p = words[n].total / countAllWords;
    pEvidence[n] = this.theMatrix.words[n].probability = p;

    /*          likelihood {P(word/Spam), P(word/Legit) ... }  */
    var qSpam = words[n].spam / words[n].total,
        qLegit = words[n].legit / words[n].total;
    this.theMatrix.words[n].likelihood = {spam: qSpam, legit: qLegit}; 
  }
}
/* 
 *  @desc DevTool: Prints a human readable matrix of the words.
 *  @note You really should not use this if there are many words
 */
NaiveBayes.prototype.printTables = function(){
  console.log('\n==== human readable matrix ====\n');
  console.log('\tWord\tSpam\tLegit\tTotal');
  for(i in nb.vocabulary){
    var k = nb.vocabulary[i];
    console.log('\t'+k+'\t'+nb.theMatrix.words[k].spam+'\t'+nb.theMatrix.words[k].legit+'\t'+nb.theMatrix.words[k].total);
  }
  console.log('\tTOTAL\t'+nb.theMatrix.wordCount.spam+'\t'+nb.theMatrix.wordCount.legit+'\t'+nb.theMatrix.wordCount.total);


  console.log('\n===== theMatrix =====');
  console.log(nb.theMatrix);
  console.log('\n==== vocabulary ====\n');
  console.log(nb.vocabulary);
}

/* 
 *  @desc Calculate the statistics of the tests run and save them to the matrix
 */
NaiveBayes.prototype.testStats = function(){
  if(typeof this.test === 'undefined'){
    console.log('\n==== testStats:: No tests run yet.');
    return 1;
  }
  var gotIt = 0,
      failed = 0,
      filesTested = 0,
      totalTrueLegit = 0,
      totalTrueSpam = 0,
      classifiedAsLegit = 0,
      classifiedAsSpam = 0,
      classifiedAsLegitIsLegit = 0,
      classifiedAsLegitIsSpam = 0,
      classifiedAsSpamIsLegit = 0,
      classifiedAsSpamIsSpam = 0;
  for(var i in this.test){
    if(this.test[i].class == 'legit'){
      // classified as is legit
      classifiedAsLegit++;
      if(this.test[i].shouldBeClass == 'legit'){
        // classified as legit and is legit
        totalTrueLegit++;
        classifiedAsLegitIsLegit++;
      }else{
        // classified as legit and is spam;
        totalTrueSpam++;
        classifiedAsLegitIsSpam++;
      }
    }else{
      // classified as spam
      classifiedAsSpam++;
      if(this.test[i].shouldBeClass == 'spam'){
        // classified as spam and is spam
        totalTrueSpam++;
        classifiedAsSpamIsSpam++;
      }else{
        // classified as spam is legit;
        totalTrueLegit++;
        classifiedAsSpamIsLegit++;
      }
    }
    if( this.test[i].class == this.test[i].shouldBeClass ){
      gotIt++;
    }else{
      failed++;
    }
    filesTested++;
  }
  var percentageGotIt = gotIt / (gotIt+failed),
      percentageFailed = failed / (gotIt+failed);
  this.theMatrix.testResults.gotIt = gotIt;
  this.theMatrix.testResults.failed = failed;
  this.theMatrix.testResults.percentageGotIt = percentageGotIt;
  this.theMatrix.testResults.percentageFailed = percentageFailed;
  this.theMatrix.testResults.messagesTested = filesTested;
  console.log('\n\n==== Test Results ===');
  console.log('\t Files tested: \t'+filesTested+'\t\tDictionary size: \t'+this.theMatrix.wordCount.total);
  console.log('\t Got it: \t'+gotIt+'\t'+(percentageGotIt*100)+'%');
  console.log('\t Failed: \t'+failed+'\t'+(percentageFailed*100)+'%');
  
  // Spam recall: (correctly identified spam messages) / (total spam messages)
  var spamRecall = classifiedAsSpamIsSpam / totalTrueSpam;
  
  // Spam precision: (correctly identified spam messages) / (total messages identified as spam)
  var spamPrecision = classifiedAsSpamIsSpam / classifiedAsSpam ;
  
  return {
            totalTrueLegit: totalTrueLegit,
            totalTrueSpam: totalTrueSpam,
            classifiedAsLegit: classifiedAsLegit,
            classifiedAsSpam: classifiedAsSpam,
            classifiedAsLegitIsLegit: classifiedAsLegitIsLegit,
            classifiedAsLegitIsSpam: classifiedAsLegitIsSpam,
            classifiedAsSpamIsLegit: classifiedAsSpamIsLegit,
            classifiedAsSpamIsSpam: classifiedAsSpamIsSpam,
            spamRecall: spamRecall, 
            spamPrecision: spamPrecision,
            gotIt: gotIt, 
            failed: failed, 
            percentageGotIt:percentageGotIt, 
            percentageFailed:percentageFailed, 
            filesTested:filesTested 
          };
          
};

/*  
 *  @desc Classify a message as legit or spam. If unknown, guess it is legit.
 */
NaiveBayes.prototype.classify = function(message){

  this.preCalculateProbs();
  var words = this.theMatrix.words;
  /*
   *                                                  P(word1/Spam) * P(word2/Spam) * ... 
   *  P(Spam/Message) = P(Spam/word1, word2, ...) =  ------------------------------------- * P(Spam)
   *                                                   P(word1) * P(word2) * ...
   *                    
   *                  = (word1.likelihood.spam * word2.likelihood.spam * ...) * theMatrix.probability.spam
   */
  var spamProbability = this.theMatrix.probability.spam;
  var legitProbability = this.theMatrix.probability.legit;
  for(var i in message){
    var msgWord = message[i];
    if(typeof words[msgWord] !== 'undefined'){    // IF we know that word
      spamProbability *=  words[msgWord].likelihood.spam;
      legitProbability *=  words[msgWord].likelihood.legit;
    }
  }
  if(spamProbability>legitProbability){
    return {class:'spam', probability: spamProbability,  probabilityNormalized: spamProbability/(spamProbability+legitProbability) , probabilitySpam: spamProbability, probabilityLegit: legitProbability};
  }else if(legitProbability>spamProbability){
    return {class:'legit', probability: legitProbability, probabilityNormalized: legitProbability/(spamProbability+legitProbability) , probabilitySpam: spamProbability, probabilityLegit: legitProbability};
  }else{
    // guess legit
    return {class:'legit', probability: legitProbability, probabilitySpam: spamProbability, probabilityLegit: legitProbability};
  }
}
/*  
 *  @desc Main object definition and initialization
 */
function NaiveBayes(exclude){
  console.log('\n ==== NaiveBayes classifier initialized ==== \n');
  // initialize an array to hold all words and an object to hold the matrix of data
  this.vocabulary = [];
  this.theMatrix = {
    words: {},
    wordCount: {
      total : 0,
      legit : 0,
      spam : 0
    },
    messages: {
      total : 0,
      legit : 0,
      spam : 0
    },
    testResults:{
      gotIt: 0,
      failed: 0,
      messagesTested: 0,
      spamRecall: 0,
      spamPrecision: 0,
    }
  };
  // Base Directory for data. Note that this dir is not included in the repo.
  this.baseDir = './data/pu1/';
  this.messagesCount = 0;
  this.spamCount = 0;
  this.legitCount = 0;
  
  /*
   *  THIS IS THE MAIN ROUTINE OF READING THE FILES
   */

  for(var dataPart=1;dataPart<=10;dataPart++){
    if(dataPart!=exclude){
      this.dir = this.baseDir+'part'+dataPart+'/';
      var files = fs.readdirSync(this.dir);
          this.messagesCount+=files.length;

      for(var i in files){
        this.learnFile(files[i]);
        if(this.isLegit(files[i])) this.legitCount++;
      }
      this.spamCount = this.messagesCount - this.legitCount;

    }
  }  
  this.countWords();

}


/* 
 *  @desc Main routine for testing all messages in the test set
 */
NaiveBayes.prototype.doTest = function(testPart) {
  this.testDir = this.baseDir+'part'+testPart+'/';
  this.test = {};
  var testFiles = fs.readdirSync(this.testDir);
      this.testCount+=testFiles.length;
  for(var i in testFiles){
    var testMessage = this.defaultTokenizer(fs.readFileSync(this.testDir+testFiles[i],{encoding:'utf8'}));
    var classification = this.classify(testMessage);
    var shouldBeClass = this.isLegit(testFiles[i]) ? 'legit':'spam';
    this.test[testFiles[i]] = {testMessage:testFiles[i], class: classification.class, shouldBeClass: shouldBeClass, classificationData: classification};
  }
}

var nb, test = {};

function GO(){
  var tic = new Date().getTime(); // Start timer
  for(var z=1;z<=10;z++){
    console.log('\n ==== Cross-validation '+z+' of 10 ==== \n');
    $('#current-state').html('Cross-validation '+z+' of 10'+'<br>');
    var nb = new NaiveBayes(z);
    nb.doTest(z);
    /*
     *  THIS IS THE MAIN ROUTINE OF CLASSIFICATION OF TEST MESSAGES
     */
    console.log('\n ==== Classification of Test messages initialized ==== \n');
    var learningTime = (new Date().getTime() - tic)/1000; // End timer
    
    var toc = (new Date().getTime() - tic)/1000; // End timer
    var classifyingTime = toc - learningTime;
    $('#time-text').html('Time spent learning: '+ Math.round(learningTime*10000)/10000 + 'secs'+'<br>');
    $('#time-text').append('Time spent classifying: '+ Math.round(classifyingTime*10000)/10000 + 'secs'+'<br>');
    $('#time-text').append('Total time: '+ Math.round(toc*10000)/10000 + 'secs');
    
    console.log('Time spent learning ' + Math.round(learningTime*10000)/10000 + 'secs');
    console.log('Time spent classifying ' + Math.round(classifyingTime*10000)/10000 + 'secs');
    console.log('Total time ' + Math.round(toc*10000)/10000 + 'secs');

    test["cross-"+z] = nb.testStats();
  }
  // Get average of tests
  var average = {
    percentageGotIt: 0, 
    percentageFailed: 0, 
    spamPrecision: 0, 
    spamRecall: 0, 
  };
  for(var i in test){
    average.percentageGotIt += test[i].percentageGotIt;
    average.percentageFailed += test[i].percentageFailed;
    average.spamPrecision += test[i].spamPrecision;
    average.spamRecall += test[i].spamRecall;
  }
  average.percentageGotIt=average.percentageGotIt/10;
  average.percentageFailed=average.percentageFailed/10;
  average.spamPrecision=average.spamPrecision/10;
  average.spamRecall=average.spamRecall/10;
  $('#test-results').html('Averages'+'<br>'+
    'success: '+Math.round(average.percentageGotIt*10000)/100+'%<br>'+
    'fail: '+Math.round(average.percentageFailed*10000)/100+'%<br>'+
    'spamPrecision: '+Math.round(average.spamPrecision*10000)/100+'%<br>'+
    'spamRecall: '+Math.round(average.spamRecall*10000)/100+'%<br>'
  );

  $("#json-holder").JSONView(test,{collapsed: true});
  $('#click-here').text('Initialize');
}