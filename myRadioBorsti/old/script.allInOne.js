'use strict'; // Debugging, better error detection

// +++++++++++++++++++++++++++++++++++++++++++++++++++
// Start and helper functions.
// +++++++++++++++++++++++++++++++++++++++++++++++++++

window.addEventListener('load', () => {
    myRadio.loadCustomElements();
    myRadio.createPlayBar();
    myRadio.loadListeners();
    // This also creates the radio list:
    // Default load favorites or login
    myRadio.checkLogin();
    // Check if there is a current stream
    myRadio.checkSessionStream();
    // Open websocket and send request data
    myRadio.sync.createConnection();
    myRadio.sync.request();
});

function $(id){
    return document.getElementById(id);
}

function tagName(name, id){
    let obj;
    if(id === null){
        obj = document.getElementsByTagName(name)[0];
    }else{
        obj = document.getElementsByTagName(name)[id];
    }
    return obj;
}

// Start of MyRadio
let myRadio = {
    
    // Site variable
    site: null,
    radioList: null,
    itemList: null,
    currentStream: null,
    currentUserID: null,
    currentUserName: null,
    theme: 0,
    themeColors: [
        { name: 'default',nav: 'rgba(0,0,0,0.8)',body: 'url(images/bg.jpg)',color: '#000',header: 'url(images/bg_h.jpg)' },
        { name: 'rainbow',nav: '#f92',body: 'url(images/bg2.jpg)',color: '#822',header: 'url(images/bg_h2.jpg)' },
        { name: 'dark',nav: '#333',body: 'url(images/bg3.jpg)',color: '#444',header: 'url(images/bg_h3.jpg)'
    }],
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that create the play-bar
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    createPlayBar: () => {
        // Create playbar
        tagName('footer').appendChild(new myRadio.playbar.PlayBar('playbar'));
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that load all listeners to the objects
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    loadListeners: () => {
        $('menu').addEventListener('click', () => { 
            myRadio.menuClick(); 
        });
        $('logo').addEventListener('click', () => { 
            myRadio.checkLogin('fav');
        });
        $('favorites').addEventListener('click', () => { 
            myRadio.checkLogin('fav');
        });
        $('login').addEventListener('click', () => { 
            myRadio.checkLogin('login');
        });
        $('radio').addEventListener('click', () => { 
            myRadio.checkLogin('radio');
        });
        $('settings').addEventListener('click', () => { 
            myRadio.checkLogin('settings');
        });
        $('about').addEventListener('click', () => { 
            myRadio.checkLogin('about');
        });
        $('audioPlayer').addEventListener('error', (e) => { 
            myRadio.checkAudioError(e);
        });
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that register all needed custom elements
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    loadCustomElements: () => {
        customElements.define('play-bar',PlayBar);
        customElements.define('radio-entry',RadioElement);
        customElements.define('list-filter',RadioFilter);
        customElements.define('login-area',Login);
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to hide the menu-botton at small 
    // devices after mouseover.
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    menuClick: () => {
        if($('menu').checked === true){
            tagName('nav').addEventListener('mouseleave', () => {
                setTimeout(function(){
                    $('menu').checked = false;
                },100);
            });
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to show a better/correct error message
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showError: (message, error) => {
        // Remove current list
        myRadio.clearCurrent();
        let errorMessage = document.createElement('div');
        errorMessage.className += 'error';
        if(error === null || error === ''){
            error = 'unknown';
        }
        let text = document.createTextNode('Error: ' + message + ' -> ' + error);
        errorMessage.appendChild(text);
        tagName('section').appendChild(errorMessage);
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to show a short error 
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showShortError: (message, error) => {
        let errorMessage = document.createElement('div');
        errorMessage.className += 'error-short';
        let text = document.createTextNode('Error: ' + message + ' => ' + error);
        errorMessage.appendChild(text);
        tagName('header').insertBefore(errorMessage, tagName('header').firstChild);
        setTimeout(() => {
            tagName('header').removeChild(errorMessage);
        },5000);
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to show a short info 
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showShortInfo: (message) => {
        let infoMessage = document.createElement('div');
        infoMessage.className += 'info-short';
        let text = document.createTextNode('Info: ' + message);
        infoMessage.appendChild(text);
        tagName('header').insertBefore(infoMessage, tagName('header').firstChild);
        setTimeout(() => {
            tagName('header').removeChild(infoMessage);
        },3000);
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to handle HTML5 audio error
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    checkAudioError: (e) => {
        // Handle
        switch (e.target.error.code) {
            case e.target.error.MEDIA_ERR_ABORTED:
                myRadio.showShortError('You aborted the audio playback.', e);
                break;
            case e.target.error.MEDIA_ERR_NETWORK:
                myRadio.showShortError('A network error caused the audio download to fail.');
                break;
            case e.target.error.MEDIA_ERR_DECODE:
                myRadio.showShortError('The audio playback was aborted due to a corruption problem.');
                break;
            case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                myRadio.showShortError('The audio not be loaded, because the format is not supported.');
                break;
            default:
                myRadio.showShortError('An unknown error occurred.');
                break;
        }
        // Hide play-bar
        myRadio.showPlayBar(false);
        // Change online state
        myRadio.changeOnlineState(myRadio.currentStream, false);
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to show/hide the play bar
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showPlayBar: (show) => {
        //while(tagName('footer').childNodes.length > 0){
        //tagName('footer').removeChild(tagName('footer').firstChild);
        //}
        if(show){
            $('info').style.display = 'none';
            $('playbar').style.display = 'block';
            // Update image
            $('playbar').firstChild.src = myRadio.currentStream._images.thumb;
            $('playbar').firstChild.title = myRadio.currentStream._name;
        }else{
            $('info').style.display = 'block';
            $('playbar').style.display = 'none';
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that check if a user is loged in
    // Load a page or content JUST with this function
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    checkLogin: (next) => {
        let valid = false;
        // Get localstorage
        let loginList = myRadio.getLoginList();
        // Get sessionstorage
        let sessionLogin;
        let sessionData = sessionStorage.getItem('login');
        if(sessionData === undefined || sessionData === null){
            sessionLogin = null;
        }else{
            sessionLogin = JSON.parse(sessionData); 
        }        
        // Check valid 
        if(sessionLogin === null){
            valid = false;
        }else{
            for(let element in loginList){
                if(sessionLogin.name === loginList[element].name){
                    if(sessionLogin.password === loginList[element].password){
                        // Login ok --------------
                        valid = true;
                        myRadio.currentUserID = loginList[element].id;
                        myRadio.currentUserName = loginList[element].name;
                        // Change theme
                        myRadio.theme = loginList[element].theme;
                        // Check theme
                        myRadio.checkTheme();
                    }
                }
            }
            // Change to logout/fav
            if(valid && next === 'login'){
                if($('login').firstChild.firstChild.nodeValue === 'Login'){

                    next = 'fav';
                    myRadio.showShortInfo('Logged in!');
                }else{
                    next = 'logout';
                    myRadio.showShortInfo('Logged out!');
                }
            }
            // Display logout and bad login
            if(valid){
                let a = $('login').firstChild;
                a.removeChild(a.firstChild);
                a.appendChild(document.createTextNode('Logout'));
            }
            if(next === 'login' && !valid){
                myRadio.showShortInfo('Login failed! Bad data');
            }
        }
        // Go on
        if(next === null || next === ''){
            next = 'fav';
        }
        // Load next
        try{
            if(valid === undefined || valid === null || valid === false){
                $('info').style.display = 'none';
                // Update nav
                myRadio.showItemsAfterLogin(false);
                // Clear 
                myRadio.clearCurrent();
                // Show login
                tagName('section').appendChild(new myRadio.logindialog.LoginDialog());
            }else{
                $('info').style.display = 'inline';
                // Update nav
                myRadio.showItemsAfterLogin(true);
                // After correct login, go on with this
                switch(next){
                    case 'fav':
                        myRadio.site = 'fav';
                        myRadio.createFavorites();
                        break;
                    case 'radio':
                        // Default radio
                        myRadio.site = 'radio';
                        myRadio.loadDirbleConnection();
                        break;
                    case 'about':
                        myRadio.site = 'about';
                        myRadio.showAbout();
                        break;
                    case 'settings':
                        myRadio.site = 'settings';
                        myRadio.showSettings();
                        break;
                    case 'logout':
                        myRadio.logout();
                        break;
                    default:
                        myRadio.showError('Can not load page!', 'Bad link');
                        break;
                }
            }
        }catch(e){
            myRadio.showError('Can not Login!', 'Bad data => ' + e);
        }
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that logg out a user
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    logout: () => {
        myRadio.currentUserID = null;
        myRadio.currentUserName = null;
        // Display login
        let a = $('login').firstChild;
        a.removeChild(a.firstChild);
        a.appendChild(document.createTextNode('Login'));
        // Clear sessionstorage dispose bar
        let state = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';
        myRadio.startPlay(state);
        sessionStorage.setItem('stream', null);
        // Reset Theme
        myRadio.theme = 0;
        myRadio.checkTheme();
        // Go on
        sessionStorage.setItem('login', null);
        myRadio.checkLogin();
    },
    
        
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Login area
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    login: {
            
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that start login a user
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        loginUser: (name, password) => {
            // Process data
            // Check hashed password
            let loginData = {
                name: name,
                password: myRadio.login.hash(password)
            };
            // Set sessionstorage
            let sessionData = JSON.stringify(loginData);
            sessionStorage.setItem('login', sessionData);
            // Login
            myRadio.checkLogin('login');
        },
        
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that start register a user
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        registerUser: (name, password) => {
            // Get localstorage
            let loginList = myRadio.getLoginList();
            // Create hashed user
            loginList.push({
                id: myRadio.randomID(),
                name: name,
                password: myRadio.login.hash(password),
                theme: 0,
                stamp: Date.now()
            });
            localStorage.setItem('login', JSON.stringify(loginList));
            myRadio.showShortInfo('Registered!');
            // Login
            myRadio.login.loginUser(name, password);
        },
        
        hash: (s) => {
          return s.split("").reduce(function(a,b){
                a = ((a<<5)-a)+b.charCodeAt(0);
                return a&a;
          },0);              
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to show settings after login
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showItemsAfterLogin: (value) => {
        if(value){
            // Favorites
            $('favorites').style.display = 'inline-block';
            // Setting
            $('settings').style.display = 'inline-block';
        }else{
            // Favorites
            $('favorites').style.display = 'none';
            // Setting
            $('settings').style.display = 'none';
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that creates the radio items based on
    // the favorites of the user
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    createFavorites: () => {
        let valid = false;
        // Get localstorage
        let favList = localStorage.getItem('favorites');
        // Crate radio list from localstorage
        if(favList !== undefined || favList !== null){
            favList = JSON.parse(favList);
            for(let element in favList){
               if(favList[element].id === myRadio.currentUserID){
                   valid = true;
                myRadio.createRadioList(favList[element].list);
               }  
            }
        }
        if(!valid){
            myRadio.createRadioList([]);
        }
        // Helper for filter
        let option = document.createElement('option');
        option.value = 'Favorties';
        option.appendChild(document.createTextNode('Favorties'));
        option.selected = 'true';
        
       $('show').appendChild(option);
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that clear current radio list
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    clearCurrent: () => {
        let myNode = tagName('section');
        while (myNode.firstChild) {
            myNode.removeChild(myNode.firstChild);
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that initialisirt the dirble connection
    // to get the sender-items.
    // At response create the radio list.
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    loadDirbleConnection: (dirbleRequest, paginationParameter) => {
        // Reset filter
        RadioElement.filtered = false;
        // "Ajax"-Objekt:
        let xhr = new XMLHttpRequest();
        // Process ajax -> 2 trys
        if(!request()){
            request();
        }    

        function request(){
            // Define dirble-request without paginationParameter
            // if parameter is empty, use HS link
            if(dirbleRequest === undefined || dirbleRequest === null){
                // Default
                dirbleRequest = 'http://api.dirble.com/v2/stations/popular';
            }
            if(paginationParameter === undefined || paginationParameter === null){
                // Deflault
                paginationParameter = '';
            }
            // First try -> HS Link/Parameter
            let dirbleUrl = `http://borsti.inf.fh-flensburg.de/dirble/getDirbleCORS.php`;
            dirbleUrl += `?dirbleRequest=${dirbleRequest}`;
            dirbleUrl += `${paginationParameter}`;
            // Process
            return sendRequest(dirbleUrl);
        }

        function sendRequest(url){
            // State
            let state = false;
            // Send Ajax-Request
            xhr.open("GET", url);
            xhr.send();
            // Process ajax-response 
            xhr.onreadystatechange = () => {
                let ergObj;
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        // parse dirbel-JSON-response from dirble 
                        ergObj = JSON.parse(xhr.responseText);
                        // Display the result by creation of the radio list
                        myRadio.createRadioList(ergObj);
                        // set state
                        state = true;
                    } else {
                        // Show error message
                        myRadio.showError('Cant connect to dirble server!', 'Connection Error ' + xhr.responseText);
                        // set state
                        state = false;
                    }
                }
            };
            return state;
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function to creates and display the radio list
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    createRadioList: (jsonRadio) => {
        // Remove current list
        myRadio.clearCurrent();
        // Create wrapper and items
        let wrapper = document.createElement('div');
        wrapper.className += 'radio-wrp';
        wrapper.setAttribute('id', 'radioList');
        // Create Filter
        wrapper.appendChild(new myRadio.radiofilter.RadioFilter('filter-bar'));
        let counter = 0;
        let elements = [];
        for(let radio in jsonRadio){
            elements[counter] = new RadioElement(jsonRadio[counter]);
            wrapper.appendChild(elements[counter]);
            counter++;
        }
        // If the list is empty, this shows it the user
        // by a item called empty
        if(elements.length === 0){
            let empty = { 
                streams : [{
                    stream : ''
                }],
                name : "empty",
                country : '',
                categories : [{
                    title: ''
                }]
            }
            wrapper.appendChild(element);
        }
        // Add to section
        tagName('section').appendChild(wrapper);
        // Update lists variables
        myRadio.itemList = elements;
        myRadio.radioList = jsonRadio;
        // Update filter variables
        if(RadioFilter.filter !== undefined && RadioFilter.filter !== null){
            $('filter').focus();
        }
        RadioFilter.sort = null;
        RadioFilter.filter = null;
        //
        // After all loaded (process time), 
        // check for online state.
        // This takes very long and may have to 
        // be disabled by default.
        // Better solution by ajax request for the link
        // but its not possible in this project.
        // checkOnlineStates(jsonRadio); <--- disabled
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that check online for every radio item
    // This way because of cross origin
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    checkOnlineStates: (elements) => {   // TODO save checked with id and use the data at reaload
        for(let i = 0; i < elements.length; i++){
            let stream = elements[i].streams[0].stream;
            // Little format check for performance
            if(stream.search('mp3') !== -1){
                myRadio.changeOnlineState(myRadio.itemList[i], true);
            }else{
                let audio = new Audio();
                // Display online state and show readyState
                audio.onerror = function() {
                    myRadio.changeOnlineState(myRadio.itemList[i], false);
                };
                audio.src = stream;
                // load() or mute() not needed(preload)
                setTimeout(() => {
                    try{
                        audio.pause();
                        myRadio.changeOnlineState(myRadio.itemList[i], true);
                    }finally{
                        audio.remove;
                    }
                }, 100); 
            }
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that check online for every radio item
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    changeOnlineState: (element, state) => {
        try{
            let img;
            for(let i = 0; i <  element.childNodes.length; i++){
                if(element.childNodes[i].className === 'radio-state'){
                    img = element.childNodes[i];
                }
            }
            if(state){
                img.src = RadioElement.getImages().online;
            }else{
                img.src =  RadioElement.getImages().offline;
            }
        }catch(e){
            
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that start playing a item
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    startPlay: (item) => {
        let audio = $('audioPlayer');
        if(item !== null && item !== ''){
            audio.src = item;
            // Display or hide play-bar
            if(audio.readyState !== null){
                audio.play();
                setTimeout(() => {
                    if(audio.readyState === 0 && !audio.paused){
                        myRadio.showPlayBar(true);
                        // Change online state
                        myRadio.changeOnlineState(myRadio.currentStream, true);
                        changeSessionStream(item, myRadio.currentStream);
                    }else{
                        $('audio-play').style.opacity = 1.0;
                        $('audio-mute').style.opacity = 1.0;
                        audio.muted = false;
                        myRadio.showPlayBar(false);
                        changeSessionStream(null);
                    } 
                },300);
            }
        }
        function changeSessionStream(streamLink, itemObj){
            let data = { stream: streamLink, obj: itemObj };
            sessionStorage.setItem('stream', JSON.stringify(data));
        }
    },

    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that show the add dialog for
    // a playlist. Also add the item to the LocalStorage
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showAddDialog: (item) => {
        // Get localstorage
        let favList = myRadio.getFavList();
        // Create if not exist
        if(favList === null || favList === []){
            favList = [{
                id: myRadio.currentUserID,
                list: []
            }];
        }
        // Add item to list
        // For every favlist
        let valid = false;
        for(let list in favList){
            if(favList[list].id === myRadio.currentUserID){
                valid = true;
                // For every list item
                for(let element in myRadio.radioList){
                    let rE = myRadio.radioList[element];
                    if(rE.id === item.getAttribute('id')){
                        favList[list].list.push(rE);
                        myRadio.showShortInfo('Item added to favorite list!');
                    }
                }
            }
        }
        if(!valid){
            for(let element in myRadio.radioList){
                let rE = myRadio.radioList[element];
                if(rE.id === item.getAttribute('id')){
                    favList = [{
                        id: myRadio.currentUserID,
                        list: [ rE ]
                    }];
                    myRadio.showShortInfo('Item added to favorite list!');
                }
            }
        }
        localStorage.favorites = JSON.stringify(favList);
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that show the remove dialog for
    // a playlist. Also remove the item to the LocalStorage
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showRemoveDialog: (item) => {
        // Get localstorage
        let favList = myRadio.getFavList();
        for(let element in favList){
            if(favList[element].id === myRadio.currentUserID){
                for(let eL in favList[element].list){
                    if(favList[element].list[eL].id === item.getAttribute('id')){
                        favList[element].list.splice(eL,1);
                        myRadio.showShortInfo('Item removed from favorite list!');
                    }
                }
            }
        }
        localStorage.favorites = JSON.stringify(favList);
        // Reload
        myRadio.checkLogin('fav');
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that check for a different theme
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    checkTheme: () => {
        switch(myRadio.theme){
            // Default
            case 0:
                tagName('nav').style.backgroundColor = myRadio.themeColors[0].nav;
                tagName('body').style.backgroundImage = myRadio.themeColors[0].body;
                tagName('body').style.color = myRadio.themeColors[0].color;
                tagName('header').style.backgroundImage = myRadio.themeColors[0].header;
                break;
            // Bright
            case 1:
                tagName('nav').style.backgroundColor = myRadio.themeColors[1].nav;
                tagName('body').style.backgroundImage = myRadio.themeColors[1].body;
                tagName('body').style.color = myRadio.themeColors[1].color;
                tagName('header').style.backgroundImage = myRadio.themeColors[1].header;
                break;
            // Dark
            case 2:
                tagName('nav').style.backgroundColor = myRadio.themeColors[2].nav;
                tagName('body').style.backgroundImage = myRadio.themeColors[2].body;
                tagName('body').style.color = myRadio.themeColors[2].color;
                tagName('header').style.backgroundImage = myRadio.themeColors[2].header;
                break;
            default:
                break;
        }
        // Get localstorage
        let loginList = myRadio.getLoginList();
        for(let element in loginList){
            if(myRadio.currentUserName === loginList[element].name){
                loginList[element].theme = myRadio.theme;
            }
        }
        localStorage.setItem('login',JSON.stringify(loginList));
    },
        
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that show about infos and a tutorial for the user
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showAbout: () => {
        // Clear
        myRadio.clearCurrent();        
        let wrapper = document.createElement('div');
        wrapper.className += 'about-wrp';
        // Create info
        let info = document.createElement('p');
        let ainfo = document.createElement('a');
        ainfo.appendChild(document.createTextNode('Info'));
        info.appendChild(ainfo);
        info.appendChild(document.createTextNode('Diese Seite wurde von Sven Kuhlmann im Rahmen einer Hausarbeit für die HS-Flensburg erstellt. Alle verwendeten Bilder und Informationen stammen von mir oder stehen unter einer Creative Commons Zero Lizenz (CC0) und sind somit frei für dritte.'));
        wrapper.appendChild(info);
        // Create tutorial
        let tutorial = document.createElement('p');
        let atutorial = document.createElement('a');
        atutorial.appendChild(document.createTextNode('Tutorial'));
        tutorial.appendChild(atutorial);
        tutorial.appendChild(document.createElement('div'));
        for(let i = 1; i < 6; i++){
            let image = document.createElement('img');
            image.src = 'images/about/'+i+'.jpg';
            tutorial.appendChild(image);
        }
        wrapper.appendChild(tutorial);
        tagName('section').appendChild(wrapper);
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that generate a random user ID
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    randomID: () => {
        let id = '';
        for(let i = 0; i < 10; i++){
            id += random() + '';   
        }
        function random(){
            let random = Math.floor((Math.random() * 9));
            return random;
        }
        return id;
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that check for a session Stream and start 
    // it, if there is one
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    checkSessionStream: () => {
        let item = sessionStorage.getItem('stream');
        if(item !== undefined && item !== null){
            item = JSON.parse(item);
            if(item !== null){
                myRadio.currentStream = item.obj;
                myRadio.startPlay(item.stream);
            }
        }
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that check for a different theme
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    showSettings: () => {
        myRadio.clearCurrent();
        let wrapper = document.createElement('div');
        wrapper.className += 'setting';
        let name = document.createElement('p');
        name.appendChild(document.createTextNode('Username: ' + myRadio.currentUserName));
        wrapper.appendChild(name);
        let theme = document.createElement('p');
        for(let i = 0; i < 3; i++){
            let button = document.createElement('button');
            button.className += 'setting-btn';
            button.appendChild(document.createTextNode('Theme ' + myRadio.themeColors[i].name));
            button.addEventListener('click', () => {
                myRadio.theme = i;
                myRadio.checkTheme();
            });
            theme.appendChild(button);
        }
        wrapper.appendChild(theme);
        tagName('section').appendChild(wrapper);
    },
       
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Synchronisation
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
 
    sync: {
        
        ws: null,
        syncFav: null,
        syncLogin: null,
        callSign: 'MyRadioBySven',
        salt: '1928349239',
        wsURL: 'ws://borsti.inf.fh-flensburg.de:8080/',
        
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function to get Fav and Login to send
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        getDataToSync: () => {
            let data = {
                fav: [],
                login: []
            };
            // Get localstorage
            let loginList = myRadio.getLoginList();
            data.login.push(loginList);
            let favList = myRadio.getFavList();
            data.fav.push(favList);
            try{
                data = JSON.stringify(data);
            }catch(e){
                myRadio.showShortError('Can not get local data!', e.message);
            }
            // Build data obj by check time stamp
            return data;
        },
        
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that write synced data to local
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        writeSyncData: (data) => {
            console.log(data);
        },
    
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that create the ws connection and callback
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        createConnection: () => {
            // WebSocket connection and define eventhandler:
            try {
                // Create connection
                myRadio.sync.ws = new WebSocket(myRadio.sync.wsURL);
                let ws = myRadio.sync.ws;
                ws.addEventListener('open', function () {
                    console.log('Start websocket on: ' + myRadio.sync.wsURL);
                });
                // Get message
                ws.addEventListener('message', (e) => {
                    // Filter system messages
                    if(e.data.substr(0,3) !== '+++'){
                        try{
                            // Convert back to String from JSON
                            let data = JSON.parse(e.data);
                            // Check callSign
                            if(myRadio.sync.checkCallSign(data.sign)){
                                // Send a broadcast with all data or wirte data
                                if(myRadio.sync.encode(data.message) === '+++ give data +++'){
                                    console.log('!!!');
                                    // Send dat broadcast
                                    myRadio.sync.send(myRadio.getDataToSync());
                                }else{
                                   // Write data to local
                                    myRadio.sync.writeSyncData(myRadio.sync.decode(data.message));
                                }
                            }
                        }catch(e){
                            console.error(' Sync: Ignore bad data!', e.message);
                        }
                    }
                });
                // Connection close
                ws.addEventListener('close', function () {
                    myRadio.showShortError('Can not connect to server to sync data!', this.readyState);
                });
            } catch (e) {
                myRadio.showShortError('Can not sync data!', e.message);
            }
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that encode a message by base64 + salt
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        encode: (message) => {
            message = btoa(message + myRadio.sync.salt);
            return message; 
        },
        
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that decode message from base64 + salt
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        decode: (message) => {
            message = atob(message + myRadio.sync.salt);
            return message;
        },
    
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Helperfunctions for callSign
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        checkCallSign: (message) => {
            let isSign=false;
            let sign = myRadio.sync.decode(message);
            if(sign === myRadio.sync.callSign){
                isSign = true;
            }
            return isSign;
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that send login and fav as broadcast
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        send: (data) => {
            let ws = myRadio.sync.ws;
            if (ws === null || ws.readyState !== WebSocket.OPEN) {
                myRadio.showShortError('Can not send sync data!', ws.readyState)
            }else{
                // Set callSign
                let callSign = myRadio.sync.encode(myRadio.sync.callSign);
                // Encode
                data = myRadio.sync.encode(data);
                // Parse JSON
                let obj = { sign : callSign ,  message: data };
                let jsonValue = JSON.stringify(obj);
                try {
                    ws.send(jsonValue);
                } catch (e) {
                    myRadio.showShortError('Can not send sync data!', e.message);
                } 
            }
        },
        
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that request a data broadcast
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        
        request: () => {
            // Check if ws is conneted
            if(myRadio.sync.ws.readyState === myRadio.sync.ws.CONNECTING){
                setTimeout(function(){
                    myRadio.sync.request();
                }, 500);
            }else{
                // Set callSign
                let callSign = myRadio.sync.encode(myRadio.sync.callSign);
                // Encode
                let data = myRadio.sync.encode('+++ give data +++');
                // Parse JSON
                let obj = { sign : callSign ,  message: data };
                let jsonValue = JSON.stringify(obj);
                try {
                    myRadio.sync.ws.send(jsonValue);
                } catch (e) {
                    myRadio.showShortError('Can not request sync data!', e.message);
                } 
            }
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that close connection
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        closeConnection: () => {
            let ws = myRadio.sync.ws;
            console.log('Sync ended');
            if (ws !== null)
                ws.close();
            ws = null;
        }
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that returns the localstorage login list
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    getLoginList: () => {
        let loginList;
        let loginData = localStorage.getItem('login');
        if(loginData === undefined || loginData === null){
            loginList = [];
        }else{
            loginList = JSON.parse(loginData); 
        }
        return loginList;
    },
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that returns the localstorage fav list
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    
    getFavList: () => {
        let favList;
        let favData = localStorage.getItem('favorites');
        if(favData === undefined || favData === null){
            favList = [];
        }else{
            favList = JSON.parse(favData); 
        }
        return favList;
    },

    // -----------------------------------------------------------------------------------
    // Classes

    // -----------------------------------------------------------------
    // Class PlayBar that creates a playbar based on a div
    // Constructor returns a node obj
    // -----------------------------------------------------------------


    playbar: class PlayBar extends HTMLElement {

        constructor(id) {
            super();
            this._id = id;
            this._class = 'bar';
            this._audio = null;
            this._fadeOutValue = 0.6;
        }

        set id(id){
            this._id = id;
        }

        get id(){
            return this._id;
        }

        connectedCallback() {
            // Create the audio-item
            this._audio = this.createAudio();
            // Create the bar
            this.className += this._class;
            this.setAttribute('id', this._id);
            let wrapper = document.createElement('div');
            wrapper.className += 'bar-wrp';
            this.appendChild(this.createImage());
            // Create control elements and edd them to the wrapper
            wrapper.appendChild(this.createPlayHalt());
            wrapper.appendChild(this.createStop());
            wrapper.appendChild(this.createVol('down'));
            wrapper.appendChild(document.createTextNode('Vol'));
            wrapper.appendChild(this.createVol('up'));
            wrapper.appendChild(this.createMute());
            wrapper.appendChild(this._audio);
            this.appendChild(wrapper);
        }

        disconnectedCallback(){
            myRadio.showShortError('Playbar failed!', 'Playbar disposed');
        }

        createAudio(){
            // Audio element --------------------------------
            let audio = document.createElement("audio");
            audio.setAttribute('id', 'audioPlayer');
            audio.className += 'bar-audio';
            //audio.controls = true;
            audio.preload = 'auto';
            audio.volume = 0.5;
            return audio;
        }

        createVol(upDown){
            // Volume up
            let vol = document.createElement('button');
            vol.className += 'bar-btn';
            if(upDown == 'up'){
                vol.appendChild(document.createTextNode('+'));
                vol.style.marginRight = '2em';
            }else{
                vol.appendChild(document.createTextNode('-'));
            }
            vol.addEventListener('click', () => {
                this.volEvnt(upDown);
            });
            return vol;
        }

        createMute(){
            // Mute
            let mute = document.createElement('button');
            mute.className += 'bar-btn';
            mute.setAttribute('id', 'audio-mute');
            mute.style.opacity = 1.0;
            mute.appendChild(document.createTextNode('\u2022))'));
            mute.addEventListener('click', () => {
                this.muteEvnt(mute);
            });
            return mute;
        }

        createStop(){
            // Stop
            let stop = document.createElement('button');
            stop.className += 'bar-btn';
            stop.style.marginRight = '2em';
            stop.setAttribute('id', 'audio-stop');
            stop.appendChild(document.createTextNode('\u25FC'));
            stop.addEventListener('click', () => {
                this.stopEvnt();
            });
            return stop;
        }

        createPlayHalt(){
            // Play/halt
            let playHalt = document.createElement('button');
            playHalt.className += 'bar-btn';
            playHalt.setAttribute('id', 'audio-play');
            playHalt.style.opacity = 1.0;
            playHalt.appendChild(document.createTextNode('>||'));
            playHalt.addEventListener('click', () => {
                this.playHaltEvnt(playHalt);
            });
            return playHalt;
        }

        createImage(){
            // Create the image placeholder
            let image = document.createElement('img');
            image.className += 'bar-img';
            image.src = 'images/noImage.jpg';
            return image;
        }

        playHaltEvnt(obj){
            if(this._audio.readyState == 4 && !this._audio.paused){
                this._audio.pause();
                obj.style.opacity = this._fadeOutValue;
            }else{
                this._audio.play();
                obj.style.opacity = 1.0;
            }
        }

        stopEvnt(){
            if(this._audio.readyState == 4){
                this._audio.pause();
                this._audio.currentTime = 0;
                // Clean state
                let state = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';
                // Check and dispose play-bar
                myRadio.startPlay(state);
            }
        }

        volEvnt(upDown){
            if(upDown == 'up'){
                if(this._audio.volume <= 0.9){
                    this._audio.volume += 0.1;
                }
            }else{
                if(this._audio.volume >= 0.1){
                    this._audio.volume -= 0.1;
                }
            }
        }
        muteEvnt(obj){
            if(this._audio.muted){
                this._audio.muted = false;
                obj.style.opacity = 1.0;
            }else{
                this._audio.muted = true;
                obj.style.opacity = this._fadeOutValue;
            }
        }
    },

    // -----------------------------------------------------------------
    // Class RadioElement that creates an element based on a div
    // Constructor returns a node obj
    // -----------------------------------------------------------------

    radioelement: class RadioElement extends HTMLElement {

        constructor(radio) {
            super();
            this._id = radio.id;
            this._name = radio.name;
            this._country = radio.country;
            this._cat = radio.categories;
            this._fb = radio.facebook;
            this._tw = radio.twitter;
            this._ws = radio.website;
            this._streams = radio.streams;
            this._genre = radio.categories;
            this._class = 'radio-elmnt';
            // Images
            let radioImage;
            if(radio.image == undefined || radio.image.thumb.url == null){
                radioImage = null;
            }else{
                try{
                    radioImage = radio.image.thumb.url;
                }catch(e){
                    radioImage = null;
                }
            }
            this._images = RadioElement.getImages(radioImage);
            // Define color ----------------------------------
            // Every second color different
            this._firstColor = 190;
            this._secondColor = 230;
            this.setColor();
        }

        connectedCallback() {
            this.className += this._class;
            this.setAttribute('id', this._id);
            this.style.backgroundColor =
                `rgb(${this._color.r}, ${this._color.g}, ${this._color.b})`;
            // Create and set all attrubutes -----------
            let thumbImage = this.createImage();
            this.appendChild(thumbImage);
            this.appendChild(this.createFav(thumbImage));
            this.appendChild(this.createTag('name'));
            this.appendChild(this.createTag('genre'));
            this.appendChild(this.createTag('country'));
            this.appendChild(this.createState(this.createState()));
            // Twitter
            if(this._tw != undefined && this._tw != null && this._tw != ''){
                if(!this.checkLink(this._tw)){
                    if(this._tw.substr(0,1)=='@'){
                        this._tw = 'https://twitter.com/' + this._tw.substr(1,this._tw.length);
                    }else{
                        this._tw = 'https://twitter.com/' + this._tw;
                    }
                }
                this.appendChild(this.createIcon('tw'));
            }
            // Facebook
            if(this._fb != undefined && this._fb != null && this._fb != ''){
                if(!this.checkLink(this._fb)){
                    this._fb = 'https://www.facebook.com/' + this._fb;
                }
                this.appendChild(this.createIcon('fb'));
            }
            // Website
            if(this._ws != undefined && this._ws != null && this._ws != '' && this.checkLink(this._ws)){
                this.appendChild(this.createIcon('ws'));
            }
            // Add event listener to start play a radio-item
            // This to a wrapper to prevent click-listener overlap
            let clickWrp = document.createElement('div');
            clickWrp.className += 'radio-click-wrp';
            clickWrp.addEventListener('click', () => {
                try{
                    // Start playing the stream
                    myRadio.startPlay(this._streams[0].stream);
                    // To change online state and image
                    myRadio.currentStream = this;
                } catch(e) {
                    // Display short error
                    myRadio.showShortError("Cannot play item!", e.message);
                }
            });
            this.appendChild(clickWrp);
        }

        disconnectedCallback() {
        //        this._clickWrp.removeEventListener('click', () => {  // ---TODO
        //            startPlay(this._streams[0].stream);
        //        });
        }

        static getImages(radioImage){
            if(radioImage==null){
                radioImage = 'images/noImage.jpg';
            }
            let images = {
                thumb: radioImage,
                prepare: 'images/unknown.png',
                online: 'images/online.png',
                offline: 'images/offline.png',
                fb: 'images/fb.png',
                tw: 'images/tw.png',
                ws: 'images/ws.png',
                unknown: 'images/noImage.jpg'
            };
            return images;
        }

        createImage(){
            let image = document.createElement('img');
            image.className += 'radio-img';
            try{
                image.src = this._images.thumb;
            } catch(e) {
                image.src = this._images.unknown;
            }
            return image;
        }

        createFav(thumbImage){
            let fav = document.createElement('img');
            fav.className += 'radio-fav';
            if(myRadio.site == null || myRadio.site != 'fav'){
                fav.src = 'images/fav.png';
                fav.addEventListener('click', () => {
                    myRadio.showAddDialog(this);
                });
            }else{
                fav.src = 'images/remove.png';
                fav.addEventListener('click', () => {
                    myRadio.showRemoveDialog(this);
                });
            }
            thumbImage.addEventListener('mouseover', () =>{
                fav.style.display ='inline';
            });
            thumbImage.addEventListener('mouseleave', () =>{
                setTimeout(()=>{
                    fav.style.display ='none';
                }, 500);
            });
            return fav;
        }

        createIcon(type){
            let outer = document.createElement('div');
            outer.className += 'radio-icon'
            let tag = document.createElement('a');
            tag.className += 'radio-icon-img';
            let icon = document.createElement('img');
            icon.className += 'radio-icon-img';
            let image, title, link;
            switch(type){
                case 'ws':
                    image = this._images.ws;
                    link = this._ws;
                    title = 'Website';
                    break;
                case 'fb':
                    image = this._images.fb;
                    link = this._fb;
                    title = 'Facebook';
                    break;
                case 'tw':
                    image = this._images.tw;
                    link = this._tw;
                    title = 'Twitter';
                    break;
                default:
                    myRadio.showShortError('Failed to load a image!', 'Bad link');
                    break;
            }
            icon.src = image;
            tag.title = title;
            tag.href = link;
            tag.target = '_blank';
            tag.appendChild(icon);
            outer.appendChild(tag);
            return outer;
        }

        createTag(tagName){
            let tag = document.createElement('fieldset');
            tag.className += 'radio-text';
            let text;
            switch(tagName){
                case 'name':
                    tag.className += ' radio-title';
                    text = document.createTextNode(this._name);
                    break;
                case 'country':
                    text = document.createTextNode(this._country);     break;
                case 'genre':
                    let value;
                    if(this._genre == undefined || this._genre == null){
                        value = 'unknown';
                    }else{
                        value = this._genre[0].title;
                    }
                    text = document.createTextNode(value);
                    break;
                default:
                    text = document.createTextNode('unknown');
                    showShortError('Failed to create a tag item!', tagName + ' : '+ this._name);
            }
            tag.appendChild(text);
            return tag;
        }

        createState(){
            let state = document.createElement('img');
            state.className = 'radio-state';
            state.src = this._images.prepare;
            state.title = 'Online state';
            return state;
        }

        setColor(){
            if (RadioElement.lastColor == null || RadioElement.lastColor == undefined || RadioElement.lastColor.r != this._firstColor){
                this._color = {
                    r: this._firstColor,
                    g: this._firstColor,
                    b: this._firstColor
                };
            }else{
                if(RadioElement.lastColor.r == this._firstColor){
                    this._color = {
                        r: this._secondColor,
                        g: this._secondColor,
                        b: this._secondColor
                    };
                }else{
                    this._color = {
                        r: this._firstColor,
                        g: this._firstColor,
                        b: this._firstColor
                    };
                }
            }
            RadioElement.lastColor = this._color;
        }

        getStateElement(){
            return this._stateElement;
        }

        checkLink(link){
            return (link.substr(0,3) == 'www' || link.substr(0,4) == 'http') ? true : false;
        }
    },

    // -----------------------------------------------------------------
    // Class RadioFilter that creates an element based on a div
    // Constructor returns a node obj
    // -----------------------------------------------------------------

    radiofilter:  class RadioFilter extends HTMLElement {

        constructor(id) {
            super();
            this._id = id;
            this._class = 'filter';
            this._showOptions = [ 'Popular', 'All'];
            this._filterOptions = [ 'None', 'Country', 'Genre'];
            this._sortOptions = [ 'None', 'Name #Az', 'Name #zA', 'Country #Az', 'Country #zA', 'Genre #Az', 'Genre #zA' ];
        }

        connectedCallback() {
            // Create the filter
            this.className += this._class;
            this.setAttribute('id', this._id);
            let wrapper = document.createElement('div');
            wrapper.className += 'filter-wrp';
            // Create control elements and edd them to the wrapper
            wrapper.appendChild(this.createShow());
            wrapper.appendChild(this.createFilter());
            wrapper.appendChild(this.createSort());
            wrapper.appendChild(this.createOnlineCheck());
            this.appendChild(wrapper);
        }

        disconnectedCallback() {
        }

        createShow(){
            // Wrapper
            let wrp = document.createElement('div');
            wrp.className += 'filter-select-wrp';
            // Selection
            let select = document.createElement('select');
            select.className += 'filter-select';
            select.setAttribute('id', 'show');
            // Options
            for(let opt in this._showOptions){
                let option = document.createElement('option');
                option.value = this._showOptions[opt];
                option.appendChild(document.createTextNode(this._showOptions[opt]));
                if(RadioElement.show != undefined && RadioElement.show != null){
                    if(RadioElement.show == this._showOptions[opt]){
                        option.selected = 'true';
                    }
                }
                select.appendChild(option);
            }
            let text = document.createTextNode('Show: ');
            select.addEventListener('change', () => {
                this.updateShow(select.value);
                RadioElement.show = select.value;
                myRadio.site = 'radio';
            });
            wrp.appendChild(text);
            wrp.appendChild(select);
            return wrp;
        }

        createFilter(){
            // Wrapper
            let wrp = document.createElement('div');
            wrp.className += 'filter-select-wrp';
            // Selection
            let input = document.createElement('input');
            input.title = 'Name/Genre/Country';
            input.className += 'filter-input';
            input.setAttribute('id', 'filter');
            input.addEventListener('keypress', (e) => {
                var key = e.which || e.keyCode;
                if (key === 13) {
                    this.updateFilter($('filter').value);
                }
            });
            let text = document.createTextNode('Filter by: ');
            // Check filtered
            if(RadioFilter.filter != undefined && RadioFilter.filter != null){
                input.value = RadioFilter.filter;
            }
            wrp.appendChild(text);
            wrp.appendChild(input);
            return wrp;
        }

        createSort(defaultValue){
            // Wrapper
            let wrp = document.createElement('div');
            wrp.className += 'filter-select-wrp';
            // Selection
            let select = document.createElement('select');
            select.className += 'filter-select';
            select.setAttribute('id', 'sort');
            // Options
            for(let opt in this._sortOptions){
                let option = document.createElement('option');
                option.value = this._sortOptions[opt];
                option.appendChild(document.createTextNode(this._sortOptions[opt]));
                // Check sorted
                if(RadioFilter.sort != undefined && RadioFilter.sort != null){
                    if(RadioFilter.sort == option.value){
                        option.selected = true;
                    }
                }
                select.appendChild(option);
            }
            select.addEventListener('change', () => {
                this.updateSort(select.value);
            });
            let text = document.createTextNode('Sort by: ');
            wrp.appendChild(text);
            wrp.appendChild(select);
            return wrp;
        }

        createOnlineCheck(){
            let wrp = document.createElement('div');
            wrp.className += 'filter-select-wrp';
            let inButton = document.createElement('button');
            inButton.className += 'filter-button';
            let text = document.createTextNode('Online: ');
            let title = document.createTextNode('Check');
            inButton.appendChild(title);
            wrp.appendChild(text);
            wrp.appendChild(inButton);
            wrp.addEventListener('click', () => {
                if(myRadio.radioList != null){
                    myRadio.checkOnlineStates(myRadio.radioList);
                }
            });
            return wrp;
        }

        updateSort(option){
            let list = myRadio.radioList;
            let direction = option.substr(option.length -3, option.length);
            let name = option.substr(0, option.length -4, option.length).toLocaleLowerCase();
            // Sort
            if(option != 'None'){
                this.sortArray(list, name, direction == '#Az' ? false : true);
                RadioFilter.sort = option;
            }
            myRadio.createRadioList(list);
        }

        sortArray(obj, item, desc){
            //sort string descending
            if(desc){
                obj.sort(function(a, b){
                    let name = getAB(a, b, item);
                    if (name[0] > name[1]){
                        return -1;
                    }
                    if (name[0] < name[1]){
                        return 1;
                    }
                    return 0 //default return value (no sorting)
                });
            }else{
                //sort string ascending
                obj.sort(function(a, b){
                    let name = getAB(a, b, item);
                    if (name[0] < name[1]){
                        return -1;
                    }
                    if (name[0] > name[1]){
                        return 1;
                    }
                    return 0 //default return value (no sorting)
                });
            }
            // Sort helper function
            function getAB(a, b, item){
                let name = [];
                switch(item){
                    case 'name':
                        name[0]=a.name.toLowerCase();
                        name[1]=b.name.toLowerCase();
                        break;
                    case 'country':
                        name[0]=a.country.toLowerCase();
                        name[1]=b.country.toLowerCase();
                    case 'genre':
                        name[0]=a.categories[0].title.toLowerCase();
                        name[1]=b.categories[0].title.toLowerCase();
                        break;
                    default:
                        name[0]='';
                        name[1]='';
                        myRadio.showShortError('Failed to sort items!', 'Bad item');
                        break;
                }
                return name;
            }
        }

        updateShow(option){
            if(option == 'Popular'){
                myRadio.loadDirbleConnection();
            }
            if(option == 'All'){
                myRadio.loadDirbleConnection('http://api.dirble.com/v2/countries/GB/stations','&offset=0&page=3&per_page=20');
            }
        }

        updateFilter(option){
            // Remember old list
            if(RadioElement.filtered == false){
                RadioElement.oldList = myRadio.radioList;
            }
            if(myRadio.radioList != null){
                if(option == ''){
                    // Reset filter
                    if(RadioElement.oldList != undefined && RadioElement.oldList != null){
                        myRadio.createRadioList(RadioElement.oldList);
                        RadioElement.oldList = null;
                        RadioElement.filtered = false;
                    }else{
                        myRadio.loadDirbleConnection();
                    }
                }else{
                    let oldList;
                    // Build a new list array by a search
                    if(RadioElement.oldList != undefined && RadioElement.oldList != null){
                        oldList = RadioElement.oldList;
                    }else{
                        oldList = myRadio.radioList;
                    }
                    let newList = [];
                    let count = 0;
                    for(let radio in oldList){
                        let check = false;
                        radio = oldList[radio];
                        if(radio.country != undefined && radio.country != null){
                            if(radio.country.search(option) != -1){
                                check = true;
                            }
                        }
                        if(radio.name != undefined && radio.name != null){
                            if(radio.name.search(option) != -1){
                                check = true;
                            }
                        }
                        if(radio.categories != undefined && radio.categories[0].title != undefined && radio.categories[0].title != null){
                            if(radio.categories[0].title.search(option) != -1){
                                check = true;
                            }
                        }
                        if(check){
                            newList[count] = radio;
                            count++;
                        }
                    }
                    RadioElement.filtered = true;
                    RadioFilter.filter = option;
                    // Show filtered items
                    myRadio.createRadioList(newList);
                }
            }else{
                myRadio.showShortError('Can not use filter!', 'Bad radio list');
            }
        }
    },

    // -----------------------------------------------------------------
    // Class Login that creates a login area based on a div
    // Constructor returns a node obj
    // -----------------------------------------------------------------

    logindialog: class LoginDialog extends HTMLElement {

        constructor() {
            super();
            this._id = 'loginArea';
            this._class = 'login';
        }

        connectedCallback() {
            // Create the Login
            this.className += this._class;
            this.setAttribute('id', this._id);
            let wrapper = document.createElement('div');
            // Create control elements and edd them to the wrapper
            this.appendChild(document.createTextNode('LOGIN'));
            wrapper.appendChild(this.createInput('Name'));
            wrapper.appendChild(this.createInput('Password'));
            wrapper.appendChild(this.createButton('Login'));
            wrapper.appendChild(this.createButton('Registration'));
            this.appendChild(wrapper);
        }

        disconnectedCallback() {
        }

        createInput(type){
            let br = document.createElement('br');
            // Wrapper
            let wrp = document.createElement('div');
            wrp.className += 'login-input-wrp';
            // Selection
            let input = document.createElement('input');
            input.className += 'login-input';
            input.setAttribute('id', 'login'+type);
            input.addEventListener('keypress', (e) => {
                var key = e.which || e.keyCode;
                if (key === 13) {
                    this.go('login');
                }
            });
            let text = document.createTextNode(type+': ');
            wrp.appendChild(text);
            wrp.appendChild(br);
            wrp.appendChild(input);
            return wrp;
        }

        createButton(type){
            let wrp = document.createElement('div');
            wrp.className += 'login-button-wrp';
            let inButton = document.createElement('button');
            inButton.className += 'login-button';
            let title = document.createTextNode(type);
            inButton.appendChild(title);
            wrp.appendChild(inButton);
            if(type == 'Registration'){
                wrp.addEventListener('click', () => {
                    this.go('registration');
                });
            }else{
                wrp.addEventListener('click', () => {
                    this.go('login');
                });
            }
            return wrp;
        }

        go(next){
            if(checkOK()){
                if(next == 'registration'){
                    myRadio.login.registerUser($('loginName').value, $('loginPassword').value);
                }else{
                    myRadio.login.loginUser($('loginName').value, $('loginPassword').value);
                }
            }else{
                myRadio.showShortError('Failed to login!', 'Empty data');
            }
            function checkOK(){
                return $('loginName').value != '' && $('loginPassword').value != '' ? true : false;
            }
        }
    }
};
// End of MyRadio
