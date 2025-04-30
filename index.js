let map = null
let latLng = {lat: 51.41856933437865, lng: -0.21294316172093747}
/* let placeType = "cafe" */
let infoWindow = null
let markers = []
// array to store all marker objects
let markerContent = []
// stores json data for custom locations
let placesService = null  // ref to Places service
let directionsRenderer = null
let directionsService = null
let allTags = new Set()
let activeTags = new Set()
let searchValue = ""
let sortOption = "default"
let countdownInterval

/* language translation */
function translateIntoEnglish() {
    // get text to translate from input field
    const foreignText = encodeURI(document.getElementById('fja_translationText').value)
    const translationLanguage = `en`
    // building google translate api url with api key and parameters
    const url = `https://translation.googleapis.com/language/translate/v2?key=AIzaSyAiytBZJxcVi_bDM4AL9kbeK6ad5k1f-bE&q=${foreignText}&source=fr&target=${translationLanguage}`

    // make api call to google translate
    fetch(url)
        .then(response => response.json())
        .then(jsonData => {
            // show translation container and display result
            document.getElementById('fja_englishTranslationContainer').style.display = 'block'
            document.getElementById('fja_englishTranslation').innerHTML = jsonData.data.translations[0].translatedText
        })
        .catch(error => {
            console.error('Translation error:', error)
            document.getElementById('fja_englishTranslation').innerHTML = 'Translation failed'
        })
}

function translateIntoFrench() {
    // get text to translate from input field
    const englishText = encodeURI(document.getElementById('fja_translationText').value)
    const translationLanguage = `fr`
    // build google translate api url with api key and parameters
    const url = `https://translation.googleapis.com/language/translate/v2?key=AIzaSyAiytBZJxcVi_bDM4AL9kbeK6ad5k1f-bE&q=${englishText}&source=en&target=${translationLanguage}`

    // make api call to google translate
    fetch(url)
        .then(response => response.json())
        .then(jsonData => {
            // show translation container and display result
            document.getElementById('fja_frenchTranslationContainer').style.display = 'block'
            document.getElementById('fja_translation').innerHTML = jsonData.data.translations[0].translatedText
        })
        .catch(error => {
            console.error('Translation error:', error)
            document.getElementById('fja_translation').innerHTML = 'Translation failed'
        })
}

/* currency conversion https://www.exchangerate-api.com/ */
function convertCurrency() {
    // get values from form inputs
    const amount = document.getElementById('fja_amount').value
    const fromCurrency = document.getElementById('fja_fromCurrency').value
    const toCurrency = document.getElementById('fja_toCurrency').value

    // used https://www.exchangerate-api.com/
    const apiKey = 'd3241aa1c981fa1cb0fee5d1'
    // build api url with parameters
    // https://www.exchangerate-api.com/docs/standard-requests
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}/${amount}`

    // make api call to exchange rate service
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // exchangerate-api.com response docs
            if (data.result === 'success') {
                // format and display conversion result
                const result = `${amount} ${fromCurrency} = ${data.conversion_result.toFixed(2)} ${toCurrency}`
                document.getElementById('fja_conversionResult').textContent = result
            } else {
                document.getElementById('fja_conversionResult').textContent = 'Conversion failed'
            }
        })
        .catch(error => {
            console.error('Currency conversion error:', error)
            document.getElementById('fja_conversionResult').textContent = 'Error during conversion'
        });
}

// Function to toggle directions panel visibility
function toggleDirections() {
    let directionsPanel = document.getElementById("fja_directions")

    if (directionsPanel.style.display === "block") {
        directionsPanel.style.display = "none"
    } else {
        directionsPanel.style.display = "block"
    }
}

// Calculate route with waypoints and travel mode
function calculateRoute(travelMode = "DRIVING") {
    document.getElementById("fja_transportMode").innerHTML = travelMode.toLowerCase()

    // Get start and end points
    let start = document.getElementById("fja_start").value
    let end = document.getElementById("fja_end").value

    if (start === "" || end === "") {
        return
    }

    // Get waypoints from checked checkboxes
    let waypoints = []
    let waypointCheckboxes = document.querySelectorAll('input[type="checkbox"][name="waypoint"]:checked')
    waypointCheckboxes.forEach(waypoint => {
        waypoints.push({
            location: waypoint.value,
            stopover: true
        })
    })

    let request = {
        origin: start,
        destination: end,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode[travelMode],
        optimizeWaypoints: true
    }

    // Clear previous directions
    document.getElementById("fja_directions").innerHTML = "<summary>Directions</summary>"

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            // Display the route
            directionsRenderer.setDirections(result)

            // Make directions panel visible
            document.getElementById("fja_directions").style.display = "block"

            // switching to map tab after calculating route
            // same method as in fja_openTab // https://www.w3schools.com/howto/howto_js_tabs.asp
            const mapTabButton = document.querySelector('.fja_tablink[onclick*="fja_mapTab"]')
            if (mapTabButton) {
                mapTabButton.click()
            }
        } else {
            console.error("Directions request failed due to " + status)
            document.getElementById("fja_directions").innerHTML = "<summary>Directions</summary><div>Unable to calculate route. Please check your inputs and try again.</div>"
        }
    })
}

function loadMap() {
    // set initial map center coordinates (wimbledon)
    let services_centre_location = {lat: 51.41856933437865, lng: -0.21294316172093747}

    // create new google map instance
    map = new google.maps.Map(document.getElementById("fja_map"), {
        mapId: "MY_MAP_ID",
        zoom: 15,
        center: new google.maps.LatLng(services_centre_location),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControlOptions: {
            mapTypeIds: ["roadmap", "satellite", "hide_poi"]
        }
    })

    // hide points of interest on map
    hidePointsOfInterest(map)

    // initialize infoWindow
    infoWindow = new google.maps.InfoWindow()

    // initialize directions services
    directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        map: map,
        panel: document.getElementById("fja_directions")
    })
    directionsService = new google.maps.DirectionsService()

    // add autocomplete to start/end inputs
    new google.maps.places.Autocomplete(document.getElementById("fja_start"))
    new google.maps.places.Autocomplete(document.getElementById("fja_end"))

    // listen for directions changes to update inputs
    directionsRenderer.addListener("directions_changed", () => {
        const directions = directionsRenderer.getDirections()
        if (directions) {
            const geocoder = new google.maps.Geocoder()

            // update start address
            if (directions.geocoded_waypoints && directions.geocoded_waypoints.length > 0) {
                let start = directions.geocoded_waypoints[0].place_id
                geocoder.geocode({placeId: start}, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results[0]) {
                        document.getElementById("fja_start").value = results[0].formatted_address
                    }
                })

                // update end address
                if (directions.geocoded_waypoints.length > 1) {
                    let end = directions.geocoded_waypoints[directions.geocoded_waypoints.length - 1].place_id
                    geocoder.geocode({placeId: end}, (results, status) => {
                        if (status === google.maps.GeocoderStatus.OK && results[0]) {
                            document.getElementById("fja_end").value = results[0].formatted_address
                        }
                    })
                }
            }
        }
    })

    /* initialize places service and load json */
    // create google places service instance
    placesService = new google.maps.places.PlacesService(map)
    // fetch json data for custom locations
    fetch('markerContent.json')
        .then(response => response.json())
        .then(jsonData => {
            // store json data and display locations
            markerContent = jsonData
            document.getElementById("fja_start").value = "Wimbledon Station, London, UK"
            document.getElementById("fja_end").value = "All England Lawn Tennis Club, London, UK"

            createWaypointOptions()
            displayLocationGallery()
            displayMap()
            initializeFilters()
        })
        .catch(error => {
            console.error("Error loading marker content:", error)
        })

    // add click listener to map to update center position
    map.addListener("click", (mapsMouseEvent) => {
        latLng = mapsMouseEvent.latLng.toJSON()
        displayMap()
    })
}

function hidePointsOfInterest(map) {
    // style definition to hide points of interest
    let styles = [
        {
            "featureType": "poi",
            "stylers": [{"visibility": "off"}]
        }
    ]

    // create styled map type with poi hidden
    let styledMapType = new google.maps.StyledMapType(styles, {
        name: "POI Hidden",
        alt: "Hide Points of Interest"
    })
    map.mapTypes.set("hide_poi", styledMapType)

    // apply the styled map
    map.setMapTypeId("hide_poi")
}

function createWaypointOptions() {
    const waypointContainer = document.getElementById("fja_waypoints")
    if (!waypointContainer) return

    waypointContainer.innerHTML = ""

    // going through my location to get wp options
    for (let i = 0; i < markerContent.length; i++) {
        const location = markerContent[i]
        if (!location.title) continue

        const waypointLabel = document.createElement("label")
        waypointLabel.className = "fja_waypointLabel"

        // waypoint checkboxes
        const waypointCheckbox = document.createElement("input")
        waypointCheckbox.type = "checkbox"
        waypointCheckbox.name = "waypoint"
        waypointCheckbox.value = location.title + ", Wimbledon, London, UK"
        waypointCheckbox.addEventListener("change", function() {
            calculateRoute(document.getElementById("fja_transportMode").innerHTML.toUpperCase())
        })

        // building checkbox structure
        waypointLabel.append(waypointCheckbox)
        waypointLabel.append(document.createTextNode(" " + location.title))

        waypointContainer.append(waypointLabel)
        waypointContainer.append(document.createElement("br"))
    }
}

function displayMap() {
    // close any open info windows
    if (infoWindow !== null) {
        infoWindow.close()
    }

    // clear existing markers by removing from map
    markers.forEach(marker => marker.map = null)
    markers = []

    // get all checked place type checkboxes
    let elements = document.getElementsByName("placeType")
    let checkedPlace = false

    // for each checked checkbox, search for nearby places
    elements.forEach(element => {
        if (element.checked) {
            checkedPlace = true
            placesService.nearbySearch({
                location: latLng,
                radius: 1000,
                type: element.value
            }, getNearbyServicesMarkers)
        }
    })

    // if no place types checked, show all custom locations
    if (!checkedPlace) {
        markerContent.forEach(location =>
            createJsonLocationMarker(location)
        )
    }

    // set zoom level and center map on clicked position
    map.setZoom(15)
    map.panTo(new google.maps.LatLng(latLng.lat, latLng.lng))
}

// creates markers for our custom locations
function createJsonLocationMarker(location) {
    // create position object from location data
    const position = {
        lat: parseFloat(location.latitude),
        lng: parseFloat(location.longitude)
    }

    // create custom icon for marker
    let icon = document.createElement("img")
    icon.src = "media/marker-icon.png"
    icon.style.width = "30px"
    icon.style.height = "30px"

    // create advanced marker
    let marker = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        content: icon,
        position: position
    })

    // add marker to markers array
    markers.push(marker)

    // build html content for info window
    let contentString = `<div style="width:250px"><h3>${location.title}</h3>
                <img src="${location.photo}" style="width:100%; max-height:150px; object-fit:cover">
                <p>${location.content}</p>
            `

    // add place details if available
    if (location.placeDetails) {
        contentString += `
          <div style="font-size:0.9em; border-top:1px solid #eee; padding-top:8px; margin-top:8px">
            <p><strong>Rating:</strong> ${location.placeDetails.rating}</p>
            <p><strong>Phone:</strong> ${location.placeDetails.phone}</p>
            <p><strong>Currently Open:</strong> ${location.placeDetails.isOpen ? 'Yes' : 'No'}</p>
            <p><strong>Website:</strong> <a href="${location.placeDetails.website}" target="_blank">Visit website</a></p>
          </div>
        `
    }

    contentString += `</div>`

    // add click listener to show info window
    google.maps.event.addListener(marker, "click", () => {
        infoWindow.setContent(contentString)
        infoWindow.open(map, marker)
    })

    return marker
}

function createMarker(place) {
    // create icon element for marker
    let icon = document.createElement("img")
    // get place type to use custom icon
    let placeType = place.types[0]
    icon.src = `media/${placeType}-icon.png`

    // fallback to google default icon
    icon.onerror = function() {
        icon.src = place.icon
        icon.onerror = null  // prevents infinite loop if google icon fails
    }

    // set icon size
    icon.style.width = "27px"
    icon.style.height = "27px"

    // create advanced marker with icon
    let marker = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        content: icon,
        position: place.geometry.location
    })

    // add marker to markers array
    markers.push(marker)

    // initialize info window if not exists
    if (infoWindow === null) {
        infoWindow = new google.maps.InfoWindow()
    }

    // add click listener to show place details in info window
    google.maps.event.addListener(marker, "click", function() {
        // Get place details
        placesService.getDetails({
            placeId: place.place_id,
            fields: ['name', 'formatted_address', 'photo', 'rating', 'formatted_phone_number', 'website', 'opening_hours']
        }, (placeDetails, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let contentString = `
                <div style="width:250px">
                    <h3>${placeDetails.name || place.name}</h3>
                `

                // Add photo if available
                if (placeDetails.photos && placeDetails.photos.length > 0) {
                    contentString += `<img src="${placeDetails.photos[0].getUrl({maxWidth: 250, maxHeight: 150})}" 
                        style="width:100%; max-height:150px; object-fit:cover">`
                }

                contentString += `<p>${placeDetails.formatted_address || ''}</p>`

                // Add additional details if available
                if (placeDetails) {
                    contentString += `
                    <div style="font-size:0.9em; border-top:1px solid #eee; padding-top:8px; margin-top:8px">
                        ${placeDetails.rating ? `<p><strong>Rating:</strong> ${placeDetails.rating}</p>` : ''}
                        ${placeDetails.formatted_phone_number ? `<p><strong>Phone:</strong> ${placeDetails.formatted_phone_number}</p>` : ''}
                        ${placeDetails.opening_hours ? `<p><strong>Currently Open:</strong> ${placeDetails.opening_hours.isOpen() ? 'Yes' : 'No'}</p>` : ''}
                        ${placeDetails.website ? `<p><strong>Website:</strong> <a href="${placeDetails.website}" target="_blank">Visit website</a></p>` : ''}
                    </div>
                    `
                }

                contentString += `</div>`

                infoWindow.setContent(contentString)
                infoWindow.open(map, marker)
            } else {
                infoWindow.setContent(place.name)
                infoWindow.open(map, marker)
            }
        })
    })
}

// tries to match google places with locations in our json data
function combinePlaceWithJsonData(placeResult) {
    // loop through all json locations
    for (let i = 0; i < markerContent.length; i++) {
        // get coordinates from json
        const jsonLat = parseFloat(markerContent[i].latitude)
        const jsonLng = parseFloat(markerContent[i].longitude)
        // get coordinates from google place
        const placeLatLng = placeResult.geometry.location.toJSON()
        // calculate distance between points
        const distance = calculateDistance(jsonLat, jsonLng, placeLatLng.lat, placeLatLng.lng)

        // if locations are close (within 50 meters)
        if (distance < 0.05) {
            // get additional details for this place
            placesService.getDetails({
                placeId: placeResult.place_id,
                fields: ['name', 'rating', 'formatted_phone_number', 'opening_hours', 'website']
            }, (placeDetails, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // store place details with json data
                    markerContent[i].placeDetails = {
                        rating: placeDetails.rating || 'N/A',
                        phone: placeDetails.formatted_phone_number || 'N/A',
                        isOpen: placeDetails.opening_hours?.isOpen() ?? 'Unknown',
                        website: placeDetails.website || 'N/A',
                        placeId: placeResult.place_id,
                        types: placeResult.types
                    }
                    // update gallery with new details
                    displayLocationGallery()
                }
            })
            break
        }
    }
}

// tries to match places with json
function getNearbyServicesMarkers(results, status) {
    // if places search was successful
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        // create marker for each result and try to match with json data
        results.forEach(result => {
            createMarker(result)
            combinePlaceWithJsonData(result)
        })
    }
}

// calculates distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371  // earth radius in km
    // convert degrees to radians
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    // haversine formula
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// converts degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

/* tag filtering */
function extractTags() {
    allTags.clear()
    markerContent.forEach(location => {
        if (location.tags && Array.isArray(location.tags)) {
            location.tags.forEach(tag => allTags.add(tag))
        }
    })
    createTagButtons()
}

// tag filter buttons for unique tags
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener esxplain more
function createTagButtons() {
    const regularTagContainer = document.getElementById('fja_tagFilters')
    const phoneTagContainer = document.getElementById('fja_tagFiltersPhone')

    if (!regularTagContainer || !phoneTagContainer) return

    regularTagContainer.innerHTML = ''
    phoneTagContainer.innerHTML = ''

    let sortedTags = []
    allTags.forEach(function(tag) {
        sortedTags.push(tag)
    })

    // sort tags alphabetically
    sortedTags.sort()

    // buttons for both regular and phone
    for (let i = 0; i < sortedTags.length; i++) {
        let tag = sortedTags[i]

        // regular tag button
        const regularButton = document.createElement('button')
        regularButton.className = 'fja_tagButton'
        regularButton.textContent = tag
        regularButton.dataset.tag = tag

        // https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
        // if tag is  click on , add 'active' class to button
        if (activeTags.has(tag)) {
            regularButton.classList.add('active')
        }

        // hover effect using event listeners
        regularButton.addEventListener('mouseenter', function() {
            // only if not active
            if (!regularButton.classList.contains('active')) {
                regularButton.classList.add('hover')
            }
        })

        regularButton.addEventListener('mouseleave', function() {
            this.classList.remove('hover')
        })

        // https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/toggle
        // click event for regular button
        regularButton.addEventListener('click', function() {
            regularButton.classList.toggle('active')
            regularButton.classList.remove('hover')

            // looks in regularTagContainer for button with exact tag so that still matches in shrunk version
            const phoneButton = phoneTagContainer.querySelector('button[data-tag="' + tag + '"]')
            // found , update
            if (phoneButton) {
                phoneButton.classList.toggle('active')
                phoneButton.classList.remove('hover')
            }

            // update tags set
            if (activeTags.has(tag)) {
                // tag exists-remove (deselecting)
                activeTags.delete(tag)
            } else {
                // tag doesn't exist-add (selecting)
                activeTags.add(tag)
            }

            // update display with filters
            filterAndDisplayLocations()
        })

        regularTagContainer.append(regularButton)

        // phone button
        const phoneButton = document.createElement('button')
        phoneButton.className = 'fja_tagButton'
        phoneButton.textContent = tag
        phoneButton.dataset.tag = tag

        // set active if tag is clicked
        if (activeTags.has(tag)) {
            phoneButton.classList.add('active')
        }

        // hover effect
        phoneButton.addEventListener('mouseenter', function() {
            if (!phoneButton.classList.contains('active')) {
                phoneButton.classList.add('hover')
            }
        })

        phoneButton.addEventListener('mouseleave', function() {
            phoneButton.classList.remove('hover')
        })

        // handle click event for mobile
        phoneButton.addEventListener('click', function() {
            phoneButton.classList.toggle('active')
            phoneButton.classList.remove('hover')

            // looks in regularTagContainer for button with exact tag
            const regularButton = regularTagContainer.querySelector('button[data-tag="' + tag + '"]')
            // if found , updates
            if (regularButton) {
                regularButton.classList.toggle('active')
                regularButton.classList.remove('hover')
            }

            // update active tags set
            if (activeTags.has(tag)) {
                // tag exists-remove (deselecting)
                activeTags.delete(tag)
            } else {
                // tag doesn't exist-add (selecting)
                activeTags.add(tag)
            }

            // update display with filters
            filterAndDisplayLocations()
        })

        phoneTagContainer.append(phoneButton)
    }
}

function handleSearch(event) {
    // getting search input -> lowercase+remove whitespace
    searchValue = event.target.value.toLowerCase().trim()
    filterAndDisplayLocations()
}

function handleSort(event) {
    sortOption = event.target.value
    filterAndDisplayLocations()
}

// filter locations based on search and clicked tags
function filterAndDisplayLocations() {
    const galleryContainer = document.getElementById('fja_locationGallery')
    if (!galleryContainer) return

    galleryContainer.innerHTML = ''
    let filteredLocations = []

    // checking each location against search and tag
    for (let i = 0; i < markerContent.length; i++) {
        let location = markerContent[i]

        let matchesSearch = searchValue === '' ||
            location.title.toLowerCase().includes(searchValue) ||
            location.content.toLowerCase().includes(searchValue)

        let matchesTags = true

        // if tag selected , check if location has at least one matching tag
        if (activeTags.size > 0) {
            matchesTags = false
            if (location.tags && location.tags.length > 0) {
                for (let j = 0; j < location.tags.length; j++) {
                    if (activeTags.has(location.tags[j])) {
                        matchesTags = true
                        break
                    }
                }
            }
        }

        // added to filtered locations if matches both search and tags
        if (matchesSearch && matchesTags) {
            filteredLocations.push(location)
        }
    }

    filteredLocations = sortLocations(filteredLocations)

    // cards for filtered locations
    filteredLocations.forEach((location, index) => {
        const card = document.createElement('div')
        card.className = 'fja_locationCard'
        card.dataset.index = index

        // place details html if available
        let placeDetailsHtml = ''
        if (location.placeDetails) {
            placeDetailsHtml = `
                <div class="fja_placeDetails">
                    Rating: ${location.placeDetails.rating} ⭐<br>
                    ${location.placeDetails.isOpen === true ? '🟢 Open now' :
                location.placeDetails.isOpen === false ? '🔴 Closed now' : ''}
                </div>
            `
        }

        // tags on location cards
        // https://css-tricks.com/connecting-ui-elements-with-visual-cues/
        let cardTags = ''
        // if tags exist in array
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
        if (location.tags && Array.isArray(location.tags)) {
            cardTags = '<div class="fja_cardTags">'
            location.tags.forEach(tag => {
                // tag active marked if clicked in filters
                const isActive = activeTags.has(tag) ? 'active' : ''
                cardTags += `<span class="fja_tag ${isActive}">${tag}</span>`
            })
            cardTags += '</div>'
        }

        card.innerHTML = `<img src="${location.photo}" alt="${location.title}"><h3>${location.title}</h3>
                    <p>${location.content.substring(0, 100)}${location.content.length > 100 ? '...' : ''}</p>
                    ${cardTags}${placeDetailsHtml}`

        // handle card click
        card.addEventListener('click', () => {
            // Clear existing markers
            markers.forEach(marker => marker.map = null)
            markers = []

            // Create a marker for the selected location
            const marker = createJsonLocationMarker(location)

            // Center the map on this location
            map.setCenter({
                lat: parseFloat(location.latitude),
                lng: parseFloat(location.longitude)
            })

            // Zoom in closer to the selected location
            map.setZoom(16)

            // scrool to the map section https://www.w3schools.com/jsref/met_element_scrollintoview.asp
            document.getElementById('fja_map').scrollIntoView({ behavior: 'smooth' });
        })

        galleryContainer.append(card)
    })

    // counting for locations
    const counter = document.getElementById('fja_locationCount')
    if (counter) {
        counter.textContent = filteredLocations.length
    }
}

// locations based on picked sort option
function sortLocations(locations) {
    switch (sortOption) {
        case 'az':
            // alphabetically asc
            return [...locations].sort((a, b) => a.title.localeCompare(b.title))
        case 'za':
            // alphabetically desc
            return [...locations].sort((a, b) => b.title.localeCompare(a.title))
        case 'distance':
            // distance from map center
            return [...locations].sort((a, b) => {
                const aLat = parseFloat(a.latitude)
                const aLng = parseFloat(a.longitude)
                const bLat = parseFloat(b.latitude)
                const bLng = parseFloat(b.longitude)

                const distA = calculateDistance(
                    aLat, aLng,
                    latLng.lat, latLng.lng
                )

                const distB = calculateDistance(
                    bLat, bLng,
                    latLng.lat, latLng.lng
                )

                return distA - distB
            })
        default:
            return locations
    }
}

function displayLocationGallery() {
    filterAndDisplayLocations()
}

// initialize the filters and search
function initializeFilters() {
    // getting the tags from locations
    extractTags()

    // handling search input
    const searchInput = document.getElementById('fja_searchInput')
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch)
    }
    else {
        console.log("search input missing - filters disabled")
    }

    // handling sort by drop
    const sortSelect = document.getElementById('fja_sortSelect')
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort)
    }
    else {
        console.log("sort by select missing - sorting disabled")
    }

    filterAndDisplayLocations()
}

// https://www.w3schools.com/howto/howto_js_tabs.asp
function fja_openTab(evt, tabName) {
    // hide all the tab content
    const tabcontent = document.getElementsByClassName("fja_tabcontent")
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // rremove active class from all tab buttons
    const tablinks = document.getElementsByClassName("fja_tablink")
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "")
    }

    // show the clicked tab and add active class to the button
    document.getElementById(tabName).style.display = "block"
    evt.currentTarget.className += " active"

    // If map tab is activated, trigger resize to fix any display issues
    if (tabName === "fja_mapTab" && map) {
        google.maps.event.trigger(map, 'resize')
    }
}

// Add functions for waypoint management
function addWaypoint() {
    const waypointInput = document.getElementById("fja_waypoint")
    if (!waypointInput || waypointInput.value.trim() === "") {
        return
    }

    const waypointContainer = document.getElementById("fja_waypoints")
    if (!waypointContainer) return

    const waypointLabel = document.createElement("label")
    waypointLabel.className = "fja_waypointLabel"

    const waypointCheckbox = document.createElement("input")
    waypointCheckbox.type = "checkbox"
    waypointCheckbox.name = "waypoint"
    waypointCheckbox.value = waypointInput.value.trim()
    waypointCheckbox.checked = true
    waypointCheckbox.addEventListener("change", function() {
        calculateRoute(document.getElementById("fja_transportMode").innerHTML.toUpperCase())
    })

    waypointLabel.append(waypointCheckbox)
    waypointLabel.append(document.createTextNode(" " + waypointInput.value.trim()))

    waypointContainer.append(waypointLabel)
    waypointContainer.append(document.createElement("br"))

    // Clear the input
    waypointInput.value = ""

    // Recalculate route
    calculateRoute(document.getElementById("fja_transportMode").innerHTML.toUpperCase())
}

function clearWaypoints() {
    const waypointContainer = document.getElementById("fja_waypoints")
    if (!waypointContainer) return

    waypointContainer.innerHTML = ""

    // Recalculate route without waypoints
    calculateRoute(document.getElementById("fja_transportMode").innerHTML.toUpperCase())
}

// setting default tab to be displayed on load
document.addEventListener('DOMContentLoaded', function() {
    // map tab by default
    document.getElementById("fja_mapTab").style.display = "block"
    document.getElementsByClassName("fja_tablink")[0].className += " active"
})

// countdown https://www.w3schools.com/howto/howto_js_countdown.asp
// popup on load https://codingartistweb.com/2021/08/show-popup-automatically-after-page-load-using-javascript/

    function updateCountdown() {
        // Set the date we're counting down to (Wimbledon 2025: typically starts in late June)
        const wimbledonDate = new Date("June 30, 2025 12:00:00").getTime();

        // Get today's date and time
        const now = new Date().getTime();

        // Find the distance between now and the countdown date
        const distance = wimbledonDate - now;

        // Calculate days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result
        document.getElementById("fja_countdownTimer").innerHTML = days + "d " + hours + "h "
            + minutes + "m " + seconds + "s ";

        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("fja_countdownTimer").innerHTML = "Wimbledon is here!";
        }
    }

// Function to create the countdown modal
function createCountdownModal() {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'fja_countdownModal';
    modal.className = 'fja_countdownModal';

    // Create modal content
    modal.innerHTML = `
        <div class="fja_countdownContent">
            <h2>Countdown to Wimbledon 2025</h2>
            <div id="fja_countdownTimer"></div>
            <div class="fja_countdownButtons">
                <button id="fja_closeModal">Close</button>
                <button id="fja_minimizeModal">Minimize</button>
            </div>
        </div>
    `;

    // Add to body
    document.body.appendChild(modal);

    // Add event listeners for buttons
    document.getElementById('fja_closeModal').addEventListener('click', function() {
        modal.style.display = 'none';
    });

    document.getElementById('fja_minimizeModal').addEventListener('click', function() {
        modal.style.display = 'none';
        showMiniCountdown();
    });

    // Start the countdown
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

// Function to create minimized sticky countdown
function showMiniCountdown() {
    // Check if mini countdown already exists
    if (document.getElementById('fja_miniCountdown')) {
        document.getElementById('fja_miniCountdown').style.display = 'block';
        return;
    }

    // Create mini countdown
    const miniCountdown = document.createElement('div');
    miniCountdown.id = 'fja_miniCountdown';
    miniCountdown.className = 'fja_miniCountdown';

    miniCountdown.innerHTML = `
        <div>Wimbledon: <span id="fja_miniTimer"></span></div>
        <button id="fja_expandCountdown" title="Expand">↑</button>
    `;

    document.body.appendChild(miniCountdown);

    // Update mini timer
    function updateMiniTimer() {
        document.getElementById('fja_miniTimer').textContent = document.getElementById('fja_countdownTimer').textContent;
    }

    updateMiniTimer();
    setInterval(updateMiniTimer, 1000);

    // Add event listener for expand button
    document.getElementById('fja_expandCountdown').addEventListener('click', function() {
        miniCountdown.style.display = 'none';
        document.getElementById('fja_countdownModal').style.display = 'block';
    });
}

// Initialize countdown modal on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Existing code
    document.getElementById("fja_mapTab").style.display = "block";
    document.getElementsByClassName("fja_tablink")[0].className += " active";

    // Create and show countdown modal
    setTimeout(function() {
        createCountdownModal();
    }, 1000); // Show after 1 second
});