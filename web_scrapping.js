///this statement is how to launch/ how to run the program
//node web_scrapping.js --excel=Worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results 

let minimist = require("minimist");
let axios = require("axios");
let fs = require("fs");
let excel = require("excel4node");
let jsdom = require("jsdom");
let path = require("path");
let pdf = require("pdf-lib");

let args = minimist(process.argv);

//extracting HTML
let dwnldPromise = axios.get(args.source);
dwnldPromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matches = [];
// extracting DATA
    let matchScoreDivs = document.querySelectorAll("div.match-info.match-info-FIXTURES");
    for(let i = 0; i < matchScoreDivs.length; i++){
        let match = {
        };
        let temp1 = matchScoreDivs[i].querySelector("div.description");
        let temp2 = temp1.textContent;
        let temp3 = temp2.split(', ');
        match.match_number = temp3[0];
        match.location = temp3[1];
        match.date = temp3[2];
        
        let namePs = matchScoreDivs[i].querySelectorAll("p.name");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;

        let scoreSpans = matchScoreDivs[i].querySelectorAll("div.score-detail > span.score");
        if(scoreSpans.length == 2){
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent;
        } else if(scoreSpans.length == 1){
            match.t1s = scoreSpans[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchScoreDivs[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;

        
        matches.push(match);
        
    }
   
// making usable form of JSON of data extracted of matches in array
    let matchesJSON = JSON.stringify(matches); // done
    fs.writeFileSync("matches.json", matchesJSON, "utf-8"); // done

    let teams = []; // done
    for (let i = 0; i < matches.length; i++) {
        putTeamInTeamsArrayIfMissing(teams, matches[i]); // done
    }

    for (let i = 0; i < matches.length; i++) {
        putMatchInAppropriateTeam(teams, matches[i]); // done
    }

    let teamsJSON = JSON.stringify(teams); // done
    fs.writeFileSync("teams.json", teamsJSON, "utf-8"); // done
// creating data folder and pdf's and excel file

    createExcelFile(teams);
    createFolders(teams);
})
.catch(function(err){
    console.log(err);
})
function createFolders(teams) {
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;
    let location = match.match_loc;
    let dates = match.match_dat;
    let number =match.match_no;
    

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 167,
            y: 590,
            size: 8
        });
        page.drawText(t2, {
            x: 167,
            y: 575,
            size: 8
        });
        page.drawText(t1s, {
            x: 400,
            y: 590,
            size: 8
        });
        page.drawText(t2s, {
            x: 400,
            y: 575,
            size: 8
        });
        page.drawText(result, {
            x: 126,
            y: 517,
            size: 8
        });
        page.drawText(number, {
            x:147,
            y: 659,
            size: 8
        });
        page.drawText(dates, {
            x: 133,
            y: 704,
            size: 8
        });
        page.drawText(location, {
            x: 118,
            y: 682,
            size: 8
        });
        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    })
}

function createExcelFile(teams) {
    let wb = new excel.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Opp Score");
        sheet.cell(1, 4).string("Result");
        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }

    wb.write(args.excel);
}

function putTeamInTeamsArrayIfMissing(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });
    }

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });
    }
} //edited

function putMatchInAppropriateTeam(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result,
        match_no: match.match_number,
        match_loc: match.location,
        match_dat: match.date
    });

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result,
        match_no: match.match_number,
        match_loc: match.location,
        match_dat: match.date
         
    });
    
}

