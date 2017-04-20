Promise = require('bluebird');
var cheerio = require('cheerio');
var http = require('https');
var jsonfile = require('jsonfile');

var file = 'solution.json';
	
var Pages = [];
//var Promos = {};
var Promos = [];
var Promos_Cloned = [];
var ResultJSON = {};
var url_category = 'https://m.bnizona.com/index.php/category/index/promo';
var counterPages = 0;
var counterPromos = 0;

var completionCounter = 0;
var promoCompletionCounter = 0;
var comS = [];
var comP = [];
var lengthOfPromos;

var fetch = function (url) {
	console.log('Processing', url);
    return new Promise(function (resolve, reject) {
        http.get(url, function (res) {
            var body = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.on('end', function () {
                resolve(body);
            })
        });
    });
};

var fetchLinkOfCategory = function(url) {
	
	// GET all links for each category
	// Page source: https://m.bnizona.com/index.php/category/index/promo
	
	return fetch(url)
		.then(function (body) {
            $ = cheerio.load(body);
            return $('.container > .twelve > .menu > li');
        })
		.then(function(lists) {
			
			lists.each(function() {
				
				var category = {
					'name': $(this).find('a').text().trim(),
					'href': $(this).find('a').attr('href')
				};
				
				Pages.push(category);
				
			});
		})
		.catch(function (err) {
            throw err;
        });
		
}

var fetchLinkOfPromo = function(category_name, category_url) {
	
	// GET all links from all category's promos
	// Sample of page source: https://m.bnizona.com/promo/index/16
	
	return fetch(category_url)
		.then(function (body) {
            $ = cheerio.load(body);
            return $('.container > .twelve > .list2 > li');
        })
		.then(function(lists) {
			
			ResultJSON[category_name] = new Array();
				
			lists.each(function() {
				
				var promo_general_info = {
					'promo_category': category_name,
					'promo_url': $(this).find('a').attr('href'),
					'merchant_logo': $(this).find('a > img').attr('src'),
					'merchant_name': $(this).find('a > .merchant-name').text().trim(),
					'promo_title': $(this).find('a > .promo-title').text().trim(),
					'valid_until': $(this).find('a > .valid-until').text().trim()
				};
				
				//Promos[category_name].push(promo_general_info);
				Promos.push(promo_general_info);
				
			});
			
			completionCounter++;
			
			console.log("Pages: " + category_url + " " + Pages.length + " " + completionCounter);
			
			/*
			if (completionCounter === 16) {
				comS.push(1);
			}
			*/
			
		})
		.catch(function (err) {
            throw err;
        });
	
}

var fetchPromos = function(promo_category, promo_url) {
	
	// GET information from a spesific promo
	// Sample of page source: https://m.bnizona.com/promo/view/16/1761
	
	/* 
		MODELLING
		
		Current state
		Promos = [obj3_1, obj3_2, obj3_3, obj2_1, obj2_2, obj1_1, obj1_2]
		
		Pop we got obj1_2 and length of Promos = 6
		
		After this, the sequence of elements in Promos is the same as before
		
	*/
	
	return fetch(promo_url)
		.then(function (body) {
            
			$ = cheerio.load(body);
			$('.container > .twelve').eq(0).remove(); // remove header row
			
			return $('.container > .twelve');
			
        })
		.then(function(body) {
			
			Promos_Cloned[Promos.length]["promo_img"] = $(this).find('.banner > img').attr('src');
			Promos_Cloned[Promos.length]["promo_share_twitter"] = $(this).find('.share > a').attr('href');
			Promos_Cloned[Promos.length]["promo_detail"] = $(this).find('.menu > li > #merchant-detail').contents().wrap();
			Promos_Cloned[Promos.length]["promo_location"] = $(this).find('.menu > li > #merchant-location').contents().wrap();
			
			promoCompletionCounter++;
			
			/*
			if (promoCompletionCounter === lengthOfPromos) {
				comP.push(1);
			}
			*/
			
		})
		.catch(function (err) {
            throw err;
        });
	
}

function writeResultJSONToFile() {
	 
	jsonfile.writeFile(file, ResultJSON, {spaces: 2}, function(err) {
		console.error(err);
	});
	
}

function startProcessPromo() {
	
	// if the Promos array is empty, we are Done!!
	if (!Promos.length) {
		
		var interval_Pages_3 = setInterval(function () {
					
					if (promoCompletionCounter === lengthOfPromos) {
						console.log("OK ALL");
						clearInterval(interval_Pages_3);
					}
					
				}, 2000);
		
		/*
		Promise.all(comP)
			.then(function() {
				
				console.log("startProcessPromo - DONE");
				
				for (var i = 0; i < lengthOfPromos; i++) {
					ResultJSON[Promos_Cloned[i]["promo_category"]].push(Promos_Cloned[i]);
				}
				
				// write ResultJSON to a file
				writeResultJSONToFile();
				
			})
			.catch(function() {
				console.log("startProcessPromo - FAILED");
			});
		*/
		
	} else {
	
		var url = Promos.pop();
		
		// Sample output
		/*
		SAMPLE OF CURRENT STATE
		Promos = [obj3_1, obj3_2, obj3_3, obj2_1, obj2_2]
		*/
		
		fetchPromos(url["promo_category"], url["promo_url"])
			.then(function(body) {
				
				console.log("Fetching promo data");
				startProcessPromo();
			
			});
		
	}
	
}

function writePromoLinksToFile() {
	
	console.log("WRITE PROMO LINKS TO FILE");
	
	jsonfile.writeFile(file, Promos_Cloned, {spaces: 2}, function(err) {
		console.error(err);
	});
	
}

function startProcess() {
			
	// if the Pages array is empty, we are Done!!
	if (!Pages.length) {
		
		var interval_Pages_1 = setInterval(function () {
                
					if (completionCounter === 16) {
						
						lengthOfPromos = Promos.length;
						Promos_Cloned = Promos.slice();
						
						console.log("startProcess - DONE: " + lengthOfPromos);
						
						writePromoLinksToFile();
						
						// get the data for each promo	
						var numberOfParallelRequests = 5;
						
						console.log("\n");
						
						//for (var i = 0; i < numberOfParallelRequests; i++) {
							//console.log("Fetching promo data [LOOP]");
							//startProcessPromo();
						//}
						
						clearInterval(interval_Pages_1);
											
						var interval_Pages_2 = setInterval(function () {
									
									if (!Promos.length) {
										clearInterval(interval_Pages_2);
									} else {
										startProcessPromo();
									}
									
								}, 2000);
						
					}
				
				}, 2000);
		
		/*
		Promise.all(comS)
			.then(function() {
				
				lengthOfPromos = Promos.length;
				Promos_Cloned = Promos.slice();
				
				console.log("startProcess - DONE: " + lengthOfPromos);
				
				writePromoLinksToFile();
				
				// get the data for each promo	
				var numberOfParallelRequests = 5;
				
				console.log("\n");
				
				for (var i = 0; i < numberOfParallelRequests; i++) {
					console.log("Fetching promo data [LOOP]");
					startProcessPromo();
				}
				
			})
			.catch(function() {
				console.log("startProcess - FAILED");
			});
		*/
		
	} else {
	
		var url = Pages.pop();
		
		//console.log("url from popped pages: " + url["name"] + " : " + url["href"]);
		
		//var json = JSON.parse(url);
		fetchLinkOfPromo(url["name"], url["href"])
			.then(function(body) {
				
				console.log("Fetching all promos from the category [NON-LOOP]");
				startProcess();
			
			});
		
	}
	
}

fetchLinkOfCategory(url_category)
	.then(function(body) {
		
		// show the categories
		console.log("Pages");
		console.log(Pages);
		
		//var numberOfParallelRequests = 3;
		
		var interval_Pages_0 = setInterval(function () {
					
					if (!Pages.length) {
						clearInterval(interval_Pages_0);
					} else {
						startProcess();
					}
					
				}, 2000);
		
		//for (var i = 0; i < numberOfParallelRequests; i++) {
			//console.log("Fetching all promos from the category [LOOP]");
			//startProcess();
		//}
		
	});



/*
var test = {};

// input two new arrays
var str = "fashion";
test[str] = new Array();

str = "grochery";
test[str] = new Array();

test[str].push({
	"first": "first",
	"second": "second"
});

console.log(test);

if (test[str] != null) {
	console.log("FILLED");
} else {
	test[str] = new Array();
}

test[str][test[str].length-1]["third"] = "third";

console.log(test);
*/