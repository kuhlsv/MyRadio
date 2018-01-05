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

function tagName(name){
    return document.getElementsByTagName(name)[0];
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
        { name: 'bright',nav: 'rgba(0,0,0,0.8)',body: 'url(images/bg.jpg)',color: '#000',header: 'url(images/bg_h.jpg)', navcolor: '#fff'},
        { name: 'rainbow',nav: '#f92',body: 'url(images/bg2.jpg)',color: '#822',header: 'url(images/bg_h2.jpg)', navcolor: '#000'},
        { name: 'dark',nav: '#333',body: 'url(images/bg3.jpg)',color: '#444',header: 'url(images/bg_h3.jpg)', navcolor:  '#fff'},
        { name: 'beer',nav: 'rgba(255,250,245,0.9)',body: 'url(images/bg4.jpg)',color: '#000',header: 'url(images/bg_h4.jpg)', navcolor: '#000'
    }],
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
    // Function that create the play-bar
    // +++++++++++++++++++++++++++++++++++++++++++++++++++

    createPlayBar: () => {
        // Create playbar
        tagName('footer').appendChild(new PlayBar('playbar'));
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
                        // Login ok ----------------------
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
        if(next == null || next == ''){
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
                tagName('section').appendChild(new Login());
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
                        myRadio.showError('Can not load page!', 'Bad link => ' + next);
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
        if(favList !== undefined && favList !== null && favList !== ''){
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
        wrapper.appendChild(new RadioFilter('filter-bar'));
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
            let element = new RadioElement(empty);
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
        // Helper function
        // Function to convert Unicode to Utf8
        // Got some code-units from the Internet
        // It removes all chars between 127 and 2047
        function encode_utf8(rohtext) {
            // dient der Normalisierung des Zeilenumbruchs
            rohtext = rohtext.replace(/\r\n/g, '');
            let utftext = "";
            for (let n = 0; n < rohtext.length; n++) {
                // ermitteln des Unicodes des  aktuellen Zeichens
                let c = rohtext.charCodeAt(n);
                // alle Zeichen von 0-127 => 1byte
                if (c > 32 && c < 128){
                    utftext += String.fromCharCode(c);
                }
                // else alle Zeichen von 127 bis 2047 => 2byte
            }
            return utftext;
        }
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
                    // Clean name to UTF8
                    let newList = {
                        id: rE.id,
                        name: JSON.parse(encode_utf8(JSON.stringify(rE.name))),
                        country: JSON.parse(encode_utf8(JSON.stringify(rE.country))),
                        image: rE.image,
                        categories: [{
                            title: JSON.parse(encode_utf8(JSON.stringify(rE.categories[0].title)))
                        }],
                        facebook:  JSON.parse(encode_utf8(JSON.stringify(rE.facebook))),
                        twitter: JSON.parse(encode_utf8(JSON.stringify(rE.twitter))),
                        website:  JSON.parse(encode_utf8(JSON.stringify(rE.website))),
                        stream: [{
                            stream:  JSON.parse(encode_utf8(JSON.stringify(rE.streams[0].stream)))
                        }]
                    };
                    if(rE.id == item.getAttribute('id')){
                        favList[list].list.push(newList);
                        favList[list].stamp = Date.now();
                        myRadio.showShortInfo('Item added to favorite list!');
                    }
                }
            }
        }
        if(!valid){
            for(let element in myRadio.radioList){
                let rE = myRadio.radioList[element];
                if(rE.id == item.getAttribute('id')){
                    favList = [{
                        id: myRadio.currentUserID,
                        stamp: Date.now(),
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
                    if(favList[element].list[eL].id == item.getAttribute('id')){
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
        try{
            tagName('nav').style.backgroundColor = myRadio.themeColors[myRadio.theme].nav;
            tagName('body').style.backgroundImage = myRadio.themeColors[myRadio.theme].body;
            tagName('body').style.color = myRadio.themeColors[myRadio.theme].color;
            tagName('header').style.backgroundImage = myRadio.themeColors[myRadio.theme].header;
            for (let i = 0; i < tagName('nav').children[0].children.length; i++) {
                tagName('nav').children[0].children[i].firstChild.style.color = myRadio.themeColors[myRadio.theme].navcolor;
            }
        }catch(e){
            myRadio.showShortError('Cant change theme', e.message);
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
        for(let i = 0; i < myRadio.themeColors.length; i++){
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
    // Here, this is myRadio.sync
    // +++++++++++++++++++++++++++++++++++++++++++++++++++
 
    sync: {

        // WS obj
        ws: null,
        // Buffer for receiving data
        receiveBuffer: '',
        // Size of connection limit: JSON length
        syncSize: 500,
        // Sign too indicate correct client software
        callSign: 'MyRadioBySven',
        // Salt string to make encode more safe
        salt: '1522343534',
        // URL to broadcast server
        wsURL: 'ws://borsti.inf.fh-flensburg.de:8080/',
        // String to indicate a ask request
        askForData: '+++GiveData+++',
    
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
                // Get message and process it
                ws.addEventListener('message', (e) => {
                    // Filter system messages
                    // and filter some bad broadcaster
                    if(e.data.substr(0,3) !== '+++' && e.data.substr(0,1) !== '|'){
                        console.log('Receiving data...');
                        try{
                            // Convert back to String from JSON
                            let data = JSON.parse(e.data);
                            // Check callSign
                            if(myRadio.sync.checkCallSign(data.sign)){
                                try {
                                    // Send a broadcast with all data or wirte data
                                    if (myRadio.sync.decode(data.message) === myRadio.sync.askForData) {
                                        // Split data and
                                        // send the broadcast
                                        myRadio.sync.checkDataSplit(myRadio.sync.getDataToSync());
                                    } else {
                                        // Write data to local
                                        myRadio.sync.writeSyncData(data);
                                    }
                                }catch(e){
                                    // If cant encode data.message => it is a data message
                                    myRadio.sync.writeSyncData(myRadio.sync.decode(data));
                                }
                            }
                        }catch(e){
                            console.error('Sync: Ignore bad data!', e.message);
                        }
                    }
                });
                // Connection close
                ws.addEventListener('close', function () {
                    myRadio.showShortError('Can not connect to server to sync data!', myRadio.sync.readyState);
                });
            } catch (e) {
                myRadio.showShortError('Can not sync data!', e.message);
            }
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that encode a message by base64 + salt
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        encode: (message) => {
            // Encode salt
            let salt = btoa(myRadio.sync.salt);
            // Encode message
            message = btoa(message);
            // Encode again: both in one
            message = btoa(message + salt);
            return message;
        },
        
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that decode message from base64 + salt
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        decode: (message) => {
            // Decode
            message = atob(message);
            // Get encoded salt
            let salt = btoa(myRadio.sync.salt);
            // Check if there is a correct salt
            if(atob(message.substr(message.length - salt.length, message.length)) === myRadio.sync.salt){
                message = atob(message.substr(0, message.length - salt.length));
            }
            return message;
        },
    
        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Helperfunctions for callSign
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        checkCallSign: (message) => {
            let isSign=false;
            let sign = myRadio.sync.decode(message);
            if(sign == myRadio.sync.callSign){
                isSign = true;
            }
            return isSign;
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that split a JSON string if its length is
        // over 200 for sync connection.
        // Send every element, the recipient put it together
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        checkDataSplit: (data) => {
            let message = JSON.stringify(data);
            // Max - Header
            let header = 0;
            let newMax = myRadio.sync.syncSize - header;
            // Check data length with max length - header
            if(message.length >= newMax){
                console.log(Math.ceil(message.length / newMax - header) + ' ' + message.length);
                for(let i = 0; i < Math.ceil(message.length / newMax) ; i++){
                    let number = i + 1;
                    // Max size for this package
                    let maxSize = myRadio.sync.syncSize - header;
                    // Check if package is smaller than 200 => adjust maxSize
                    let buffer = message.length - (i * newMax);
                    if((i * newMax) + myRadio.sync.syncSize > message.length){
                        maxSize = buffer;
                    }
                    // Check for last package => set number to 0
                    // 0 indicate that it it the last package
                    if(i + 1 >= message.length / (myRadio.sync.syncSize - header)){
                        number = 0;
                    }
                    // Split string by number*size and that + max size
                    let begin = i * (newMax);
                    myRadio.sync.send(number, message.substr(begin, maxSize));
                }
            }else{
                // Send full message
                myRadio.sync.send(0, message);
            }
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that send login and fav as broadcast
        // Also create a header of splitted data
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        send: (packageNumber, data) => {
            console.log('Sending data...');
            let ws = myRadio.sync.ws;
            if (ws === null || ws.readyState !== WebSocket.OPEN) {
                myRadio.showShortError('Can not send sync data!', ws.readyState)
            }else{
                // Set callSign
                let callSign = myRadio.sync.encode(myRadio.sync.callSign);
                // Encode
                data = myRadio.sync.encode(data);
                // Parse JSON
                let obj = { header: packageNumber, sign : callSign ,  message: data };
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
                console.log('Request data...');
                // Set callSign
                let callSign = myRadio.sync.encode(myRadio.sync.callSign);
                // Encode
                let data = myRadio.sync.encode(myRadio.sync.askForData);
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
        // Function to get Fav and Login to send
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        getDataToSync: () => {
            let data = {
                fav: null,
                login: null
            };
            // Get localstorage
            let loginList = myRadio.getLoginList();
            data.login = loginList;
            let favList = myRadio.getFavList();
            data.fav = favList;
            // Build data obj by check time stamp
            return data;
        },

        // +++++++++++++++++++++++++++++++++++++++++++++++++++
        // Function that write synced data to local
        // +++++++++++++++++++++++++++++++++++++++++++++++++++

        writeSyncData: (data) => {
            let combined = null;
            // decode data back
            let message = myRadio.sync.decode(data.message);
            // Write Data
            try{
                // Put multiple packages together
                if(myRadio.sync.receiveBuffer.length == 0) {
                    myRadio.sync.receiveBuffer = message;
                }else {
                    myRadio.sync.receiveBuffer += message;
                }
                // Check if there is just one package
                // or it is the last one. That write it
                if(data.header === 0){
                    // Parse data
                    try{
                        console.log(myRadio.sync.receiveBuffer);
                        combined = JSON.parse(myRadio.sync.receiveBuffer);
                    }catch(e){
                        console.error('Can not write data to storage. Bad json data! => ' + e.message);
                    }
                    // After go all data, now we check if there are //
                    // some new data (timestamp) and write them to local //
                    // Load local storage
                    let localLogin = myRadio.getLoginList();
                    let localFav = myRadio.getFavList();
                    // Login -----
                    // Check new login data
                    if(combined.login !== null && combined.login !== ''){
                        // Write full data
                        if (localLogin == null || localLogin == '') {
                            localStorage.setItem('login', JSON.stringify(combined.login));
                        } else {
                            // Write missing data
                            for (let user in combined.login) {
                                let valid = true;
                                for (let item in localLogin) {
                                    if (localLogin[item].id === combined.login[user].id) {
                                        valid = false;
                                    }
                                }
                                if (valid) {
                                    localLogin.push(combined.login[user]);
                                }
                            }
                            // Write
                            localStorage.setItem('login', JSON.stringify(localLogin));
                        }
                    }
                    // Favorites ----
                    // Check new favrites data
                    // Write full data
                    if(combined.fav != null && combined.fav != ''){
                        if(localFav == null || localFav == ''){
                            localStorage.setItem('favorites', JSON.stringify(combined.fav));
                        }else{
                            // Write missing data
                            for(let fav in combined.fav) {
                                let check = true;
                                let valid = false;
                                for (let item in localFav) {
                                    if(localFav[item].id == combined.fav[fav].id) {
                                        if (localFav[item].stamp <= combined.fav[fav].stamp) {
                                            valid = true;
                                        }
                                    }
                                }
                                if (valid && check) {
                                    localFav.push(combined.fav[fav]);
                                }
                            }
                            localStorage.setItem('favorites', JSON.stringify(localFav));
                        }
                    }
                }
            }catch(e){
                console.error('Can not write data to storage. Bad data format! ->' + e.message);
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
        if(loginData === undefined || loginData === null || loginData == ''){
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
        if(favData === undefined || favData === null || favData == ''){
            favList = [];
        }else{
            favList = JSON.parse(favData); 
        }
        return favList;
    }
};
// End of MyRadio
