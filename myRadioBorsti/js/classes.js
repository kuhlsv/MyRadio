'use strict'; // Debugging, better error detection

// -----------------------------------------------------------------
// Class PlayBar that creates a playbar based on a div
// Constructor returns a node obj
// -----------------------------------------------------------------

class PlayBar extends HTMLElement {
    
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
        this._audio = PlayBar.createAudio();
        // Create the bar
        this.className += this._class;
        this.setAttribute('id', this._id);
        let wrapper = document.createElement('div');
        wrapper.className += 'bar-wrp';
        this.appendChild(PlayBar.createImage());
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
    
    static createAudio(){
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
        if(upDown === 'up'){
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
    
    static createImage(){
        // Create the image placeholder
        let image = document.createElement('img');
        image.className += 'bar-img';
        image.alt = 'Sender image';
        image.src = 'images/noImage.jpg';
        return image;
    }
    
    playHaltEvnt(obj){
        if(this._audio.readyState === 4 && !this._audio.paused){
            this._audio.pause();
            obj.style.opacity = this._fadeOutValue;
        }else{
            this._audio.play();
            obj.style.opacity = 1.0;
        }
    }
    
    stopEvnt(){
        if(this._audio.readyState === 4){
            this._audio.pause();
            this._audio.currentTime = 0;
            // Clean state
            let state = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';
            // Check and dispose play-bar
            myRadio.startPlay(state);
        }
    }
        
    volEvnt(upDown){
        if(upDown === 'up'){
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
}

// -----------------------------------------------------------------
// Class RadioElement that creates an element based on a div
// Constructor returns a node obj
// -----------------------------------------------------------------

class RadioElement extends HTMLElement {
    
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
        if(radio.image === undefined || radio.image.thumb === null){
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
        this.appendChild(this.createState());
        // Twitter
        if(this._tw !== undefined && this._tw !== null && this._tw !== ''){
            if(!RadioElement.checkLink(this._tw)){
                if(this._tw.substr(0,1) === '@'){
                    this._tw = 'https://twitter.com/' + this._tw.substr(1,this._tw.length);
                }else{
                   this._tw = 'https://twitter.com/' + this._tw; 
                }
            }
            this.appendChild(this.createIcon('tw'));
        }
        // Facebook
        if(this._fb !== undefined && this._fb !== null && this._fb !== ''){
            if(!RadioElement.checkLink(this._fb)){
                this._fb = 'https://www.facebook.com/' + this._fb;
            }
            this.appendChild(this.createIcon('fb'));
        }
        // Website
        if(this._ws !== undefined && this._ws !== null && this._ws !== '' && RadioElement.checkLink(this._ws)){
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
    
    static getImages(radioImage){
        if(radioImage === null){
            radioImage = 'images/noImage.jpg';
        }
        return {
            thumb: radioImage,
            prepare: 'images/unknown.png',
            online: 'images/online.png',
            offline: 'images/offline.png',
            fb: 'images/fb.png',
            tw: 'images/tw.png',
            ws: 'images/ws.png',
            unknown: 'images/noImage.jpg'
        };
    }
    
    createImage(){
        let image = document.createElement('img');
        image.className += 'radio-img';
        image.alt = 'Radio image';
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
        fav.alt = 'Add Fav';
        if(myRadio.site === null || myRadio.site !== 'fav'){
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
        return fav;
    }
    
    createIcon(type){
        let outer = document.createElement('div');
        outer.className += 'radio-icon';
        let tag = document.createElement('a');
        tag.className += 'radio-icon-img';
        let icon = document.createElement('img');
        icon.className += 'radio-icon-img';
        icon.alt = 'Icon';
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
                if(this._genre === undefined || this._genre === null){
                    value = 'unknown';
                }else{
                    value = this._genre[0].title;
                }
                text = document.createTextNode(value);
                break;
            default:
                text = document.createTextNode('unknown'); 
                myRadio.showShortError('Failed to create a tag item!', tagName + ' : '+ this._name);
        }
        tag.appendChild(text);
        return tag;
    }
    
    createState(){
        let state = document.createElement('img');
        state.className = 'radio-state';
        state.alt = 'State';
        state.src = this._images.prepare;
        state.title = 'Online state';
        return state;
    }
    
    setColor(){
        if (RadioElement.lastColor === null || RadioElement.lastColor === undefined || RadioElement.lastColor.r !== this._firstColor){
            this._color = {
                r: this._firstColor,
                g: this._firstColor,
                b: this._firstColor
            };
        }else{
            if(RadioElement.lastColor.r === this._firstColor){
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

    
    static checkLink(link){
        return (link.substr(0, 3) === 'www' || link.substr(0, 4) === 'http');
    }
}

// -----------------------------------------------------------------
// Class RadioFilter that creates an element based on a div
// Constructor returns a node obj
// -----------------------------------------------------------------

class RadioFilter extends HTMLElement {
    
    constructor(id) {
        super();
        this._id = id;
        this._class = 'filter';
        this._showOptions = [ 'All', 'Popular'];
        this._filterOptions = [ 'None', 'Country', 'Genre'];
        this._sortOptions = [ 'None', 'Name #Az', 'Name #zA', 'Country #Az', 'Country #zA', 'Genre #Az', 'Genre #zA' ];
        this._genreOptions = [ 'Trance', 'Rock', 'Dance'];
        this._countryOptions = [ 'DE', 'GB', 'US'];
    }
    
    connectedCallback() {
        // Create the filter
        this.className += this._class;
        this.setAttribute('id', this._id);
        let wrapper = document.createElement('div');
        wrapper.className += 'filter-wrp';
        // Create control elements and edd them to the wrapper
        wrapper.appendChild(this.createShow());
        wrapper.appendChild(this.createSort());
        wrapper.appendChild(this.createFilter());
        wrapper.appendChild(this.createOnlineCheck());
        this.appendChild(wrapper);
    }
    
    createShow(){
        // Wrapper
        let wrp = document.createElement('div');
        wrp.className += 'filter-select-wrp';
        //
        // Selection
        //
        let select = document.createElement('select');
        select.className += 'filter-select';
        select.setAttribute('id', 'show');
        // Options
        for(let opt in this._showOptions){
            let option = document.createElement('option');
            option.value = this._showOptions[opt];
            option.appendChild(document.createTextNode(this._showOptions[opt]));
            if(RadioElement.show !== undefined && RadioElement.show !== null){
                if(RadioElement.show === this._showOptions[opt]){
                    option.selected = 'true';
                }
            }
            select.appendChild(option);
        }
        //
        // Optionsgroup Genre
        //
        let optiongroup = document.createElement('optgroup');
        // Options
        for(let opt in this._genreOptions) {
            let option = document.createElement('option');
            option.value = this._genreOptions[opt];
            option.appendChild(document.createTextNode(this._genreOptions[opt]));
            if (RadioElement.show !== undefined && RadioElement.show !== null) {
                if (RadioElement.show === this._genreOptions[opt]) {
                    option.selected = 'true';
                }
            }
            optiongroup.appendChild(option);
        }
        optiongroup.label = 'Genre';
        select.appendChild(optiongroup);
        //
        // Optionsgroup Country
        //
        optiongroup = document.createElement('optgroup');
        // Options
        for(let opt in this._countryOptions) {
            let option = document.createElement('option');
            option.value = this._countryOptions[opt];
            option.appendChild(document.createTextNode(this._countryOptions[opt]));
            if (RadioElement.show !== undefined && RadioElement.show !== null) {
                if (RadioElement.show === this._countryOptions[opt]) {
                    option.selected = 'true';
                }
            }
            optiongroup.appendChild(option);
        }
        optiongroup.label = 'Country';
        select.appendChild(optiongroup);
        // Select listener
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
        input.className += 'filter-input-srch';
        input.type = 'search';
        input.setAttribute('id', 'filter');
        input.addEventListener('keypress', (e) => {
            let key = e.which || e.keyCode;
            if (key === 13) {
                RadioFilter.updateFilter($('filter').value);
            }
        });
        let text = document.createTextNode('Filter by: ');
        // Check filtered
        if(RadioFilter.filter !== undefined && RadioFilter.filter !== null){
            input.value = RadioFilter.filter;
        }
        wrp.appendChild(text);
        wrp.appendChild(input);
        return wrp;
    }
    
    createSort(){
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
            if(RadioFilter.sort !== undefined && RadioFilter.sort !== null){
                if(RadioFilter.sort === option.value){
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
           if(myRadio.radioList !== null){
               myRadio.checkOnlineStates(myRadio.radioList);
           } 
        });
        return wrp;
    }
    
    updateSort(option){
        let list = myRadio.radioList;
        let direction = option.substr(option.length -3, option.length);
        let name = option.substr(0, option.length -4).toLocaleLowerCase();
        // Sort
        if(option !== 'None'){
            this.sortArray(list, name, direction !== '#Az');
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
        if(option === 'Popular'){
            myRadio.dirblePage = '';
            myRadio.loadDirbleConnection();
        }else{
            if(option === 'All'){
                myRadio.dirblePage = 1;
                myRadio.dirbleRequest = 'http://api.dirble.com/v2/stations';
                myRadio.loadDirbleConnection();
            }else{
                if(option === this._genreOptions[0] || option === this._genreOptions[1] || option == this._genreOptions[2]){
                    let id = option === this._genreOptions[0] ? 1 : option === this._genreOptions[1] ? 2 : 3;
                    myRadio.dirblePage = 1;
                    myRadio.dirbleRequest = 'http://api.dirble.com/v2/category/'+ id +'/stations';
                    myRadio.loadDirbleConnection();
                }else{
                    if(option === this._countryOptions[0] || option === this._countryOptions[1] || option == this._countryOptions[2]){
                        myRadio.dirblePage = 1;
                        myRadio.dirbleRequest = 'http://api.dirble.com/v2/countries/'+ option +'/stations';
                        myRadio.loadDirbleConnection();
                    }
                }
            }
        }
    }
    
    static updateFilter(option){
        // Remember old list
        if(RadioElement.filtered === false){
            RadioElement.oldList = myRadio.radioList;
        }
        if(myRadio.radioList !== null){
            if(option === ''){
                // Reset filter
                if(RadioElement.oldList !== undefined && RadioElement.oldList !== null){
                    myRadio.createRadioList(RadioElement.oldList);
                    RadioElement.oldList = null;
                    RadioElement.filtered = false;
                }else {
                    if (myRadio.site == 'fav') {
                        myRadio.createFavorites();
                    } else {
                        myRadio.loadDirbleConnection();
                    }
                }
            }else{
                let oldList;
                // Build a new list array by a search
                if(RadioElement.oldList !== undefined && RadioElement.oldList !== null){
                    oldList = RadioElement.oldList;
                }else{
                    oldList = myRadio.radioList;   
                }
                let newList = [];
                let count = 0;
                for(let radio in oldList){
                    let check = false;
                    radio = oldList[radio];
                    if(radio.country !== undefined && radio.country !== null){
                        if(radio.country.search(option) !== -1){
                            check = true;
                        }
                    }
                    if(radio.name !== undefined && radio.name !== null){
                        if(radio.name.search(option) !== -1){
                            check = true;
                        }
                    }
                    if(radio.categories !== undefined && radio.categories[0].title !== undefined && radio.categories[0].title !== null){
                        if(radio.categories[0].title.search(option) !== -1){
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
}

// -----------------------------------------------------------------
// Class Login that creates a login area based on a div
// Constructor returns a node obj
// -----------------------------------------------------------------

class Login extends HTMLElement {
    
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
    
    createInput(type){
        let br = document.createElement('br');
        // Wrapper
        let wrp = document.createElement('div');
        wrp.className += 'login-input-wrp';
        // Selection
        let input = document.createElement('input');
        input.className += 'login-input';
        input.setAttribute('id', 'login'+type);
        input.type = type == 'Name' ?  'text' : 'password';
        input.addEventListener('keypress', (e) => {
            let key = e.which || e.keyCode;
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
        if(type === 'Registration'){
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
            if(next === 'registration'){
                myRadio.login.registerUser($('loginName').value, $('loginPassword').value);
            }else{
                myRadio.login.loginUser($('loginName').value, $('loginPassword').value);
            }
        }else{
            myRadio.showShortError('Failed to login!', 'Empty data');
        }
        function checkOK(){
            return $('loginName').value !== '' && $('loginPassword').value !== '';
        }
    }
}