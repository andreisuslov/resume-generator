// This function runs when the window has finished loading
window.onload = async () => {
    console.log("DEBUG: window.onload event fired. Starting script.");
    try {
        console.log("DEBUG: Attempting to fetch 'resume-data.yaml'...");
        const response = await fetch('resume-data.yaml');
        console.log("DEBUG: Fetch response received.", response);

        if (!response.ok) {
            // Throw a specific error for bad network responses
            throw new Error(`HTTP error! status: ${response.status} - Could not fetch resume-data.yaml. Check if the file exists and the path is correct.`);
        }

        const yamlText = await response.text();
        console.log("DEBUG: Successfully fetched resume-data.yaml content:\n", yamlText);

        console.log("DEBUG: Attempting to parse YAML content...");
        const data = jsyaml.load(yamlText);
        console.log("DEBUG: YAML parsed successfully into data object:", data);

        if (!data) {
             throw new Error("YAML file is empty or could not be parsed into a valid object.");
        }

        console.log("DEBUG: Calling populateResume() with parsed data...");
        populateResume(data);

    } catch (error) {
        // This catch block is crucial for debugging a blank page
        console.error("DEBUG: CRITICAL ERROR in window.onload:", error);
        const container = document.getElementById('resume-container');
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center; font-family: monospace;"><b>Failed to load resume data.</b><br>Check the browser's developer console (F12) for more details.<br><br><i>Error: ${error.message}</i></p>`;
        } else {
            console.error("DEBUG: Could not even find 'resume-container' to display the error message.");
        }
    }
};

function populateResume(data) {
    console.log("DEBUG: populateResume() function started.");
    
    // A helper function to safely set content and warn if the element is missing
    const setContent = (id, content) => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = content;
        } else {
            console.warn(`DEBUG: Element with ID '${id}' not found in the HTML.`);
        }
    };

    // Populate Header
    console.log("DEBUG: Populating header...");
    setContent('resume-name', `<h1 class="js-resizable-text">${data.name}</h1>`);
    if (data.contact) {
        const contact = data.contact;
        setContent('contact-info', `<div class="contact-info js-resizable-text">${contact.phone} | <a href="${contact.linkedin}">LinkedIn</a> | <a href="${contact.github}">GitHub</a> | <a href="mailto:${contact.email}">${contact.email}</a></div>`);
    } else {
        console.warn("DEBUG: 'contact' data not found in YAML.");
    }
    
    // Populate Work Experience
    const workContainer = document.getElementById('work-experience-container');
    if (workContainer && data.work_experience) {
        console.log(`DEBUG: Populating Work Experience with ${data.work_experience.length} items.`);
        data.work_experience.forEach(job => {
            const jobDiv = document.createElement('div');
            jobDiv.className = 'job';
            let descHtml = '<ul class="description">';
            // ### FIX: Changed job.tagline to job['organization-tagline'] to match YAML
            if (job['organization-tagline']) {
                descHtml += `<li class="company-tagline js-resizable-text"><i>${job['organization-tagline']}</i></li>`;
            }
            job.responsibilities?.forEach(r => descHtml += `<li class="js-resizable-text">${r}</li>`);
            descHtml += '</ul>';
            jobDiv.innerHTML = `<div class="job-header js-resizable-text"><span class="company-name">${job.company}</span><span class="location">${job.location}</span></div><div class="job-header js-resizable-text"><span class="job-title">${job.title}</span><span class="date">${job.dates}</span></div>${descHtml}`;
            workContainer.appendChild(jobDiv);
        });
    } else {
        console.warn("DEBUG: Could not find 'work-experience-container' element or 'work_experience' data in YAML.");
    }

    // Populate Volunteering
    const volunteeringContainer = document.getElementById('volunteering-container');
    if (volunteeringContainer && data.volunteering) {
        console.log(`DEBUG: Populating Volunteering with ${data.volunteering.length} items.`);
        data.volunteering.forEach(role => {
            const volunteerDiv = document.createElement('div');
            volunteerDiv.className = 'volunteering';
            let descHtml = '<ul class="description">';
             // ### FIX: Changed role.tagline to role['organization-tagline'] to match YAML
            if (role['organization-tagline']) {
                descHtml += `<li class="company-tagline js-resizable-text"><i>${role['organization-tagline']}</i></li>`;
            }
            role.responsibilities?.forEach(r => descHtml += `<li class="js-resizable-text">${r}</li>`);
            descHtml += '</ul>';
            volunteerDiv.innerHTML = `<div class="volunteer-header js-resizable-text"><span class="org-name">${role.organization}</span><span class="location">${role.location}</span></div><div class="volunteer-header js-resizable-text"><span class="volunteer-title">${role.title}</span><span class="date">${role.dates}</span></div>${descHtml}`;
            volunteeringContainer.appendChild(volunteerDiv);
        });
    } else {
        console.warn("DEBUG: Could not find 'volunteering-container' element or 'volunteering' data in YAML.");
    }

    // Populate Education
    const educationContainer = document.getElementById('education-container');
    if (educationContainer && data.education) {
        console.log(`DEBUG: Populating Education with ${data.education.length} items.`);
        data.education.forEach(edu => {
            const eduDiv = document.createElement('div');
            eduDiv.className = 'education';
            eduDiv.innerHTML = `<div class="degree-header js-resizable-text"><span class="school-name"><b>${edu.institution}</b>; ${edu.location}</span><span class="date">${edu.graduation_date}</span></div><p class="details js-resizable-text">${edu.details}</p>`;
            educationContainer.appendChild(eduDiv);
        });
    } else {
        console.warn("DEBUG: Could not find 'education-container' element or 'education' data in YAML.");
    }

    // =================================================================
    // DYNAMIC SKILLS SECTION
    // =================================================================
    const skillsTbody = document.getElementById('skills-tbody');
    if (skillsTbody && data.skills) {
        console.log("DEBUG: Populating Skills dynamically.");
        const skills = data.skills;
        let skillsHtml = '';

        // A helper function to format the key for display
        const formatSkillTitle = (key) => {
            const spaced = key.replace(/_/g, ' '); // 'hard_skills' -> 'hard skills'
            const words = spaced.split(' '); // 'hard skills' -> ['hard', 'skills']
            // Capitalize the first letter of each word and join back
            return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        // Loop over every key in the 'skills' object
        for (const key in skills) {
            if (Object.hasOwn(skills, key)) {
                const title = formatSkillTitle(key);
                let value = skills[key];

                // If the value is an array, join it into a string. Otherwise, use as is.
                const displayValue = Array.isArray(value) ? value.join('; ') : value;

                // Append a new table row for this skill category with fixed width for title cell
                skillsHtml += `<tr><td class="js-resizable-text" style="width: 150px; white-space: nowrap;">${title}:</td><td class="js-resizable-text">${displayValue}</td></tr>`;
            }
        }
        skillsTbody.innerHTML = skillsHtml; // Set the combined HTML
    } else {
        console.warn("DEBUG: Could not find 'skills-tbody' element or 'skills' data in YAML.");
    }

    console.log("DEBUG: Content population complete. Calling adjustContentToPage().");
    // Call the resizing logic after content is on the page.
    adjustContentToPage();
}


// =================================================================================
// RESIZING LOGIC (with its own debugging)
// =================================================================================

function adjustContentToPage() {
    console.log("DEBUG: adjustContentToPage() function started.");
    const container = document.getElementById('resume-container');
    if (!container) {
        console.error("DEBUG: adjustContentToPage() could not find the 'resume-container'. Aborting resize.");
        return;
    }

    document.body.removeAttribute('data-rendering-complete');

    const resizableElements = Array.from(container.querySelectorAll('.js-resizable-text'));
    const targetHeight = container.clientHeight;
    console.log(`DEBUG: Found ${resizableElements.length} resizable elements. Container target height is ${targetHeight}px.`);
    
    if (resizableElements.length === 0) {
        console.warn("DEBUG: No elements with class 'js-resizable-text' found to resize.");
        document.body.setAttribute('data-rendering-complete', 'true');
        return;
    }

    // Store the initial font size of each element in pixels.
    const initialFontSizes = resizableElements.map(el => {
        el.style.fontSize = ''; 
        return parseFloat(window.getComputedStyle(el).fontSize);
    });
    console.log("DEBUG: Captured initial font sizes (in px):", initialFontSizes);
    
    const applyScale = (scale) => {
        resizableElements.forEach((el, index) => {
            el.style.fontSize = `${initialFontSizes[index] * scale}px`;
        });
    };

    // Use a binary search to find the optimal font size scale.
    let minScale = 0.1;
    let maxScale = 3.0;
    let bestScale = 1.0;

    for (let i = 0; i < 10; i++) { 
        let midScale = (minScale + maxScale) / 2;
        applyScale(midScale);
        
        if (container.scrollHeight > targetHeight) {
            maxScale = midScale;
        } else {
            bestScale = midScale;
            minScale = midScale;
        }
    }

    applyScale(bestScale);

    console.log(`DEBUG: Resizing complete. Optimal scale found: ${bestScale}. Final scrollHeight: ${container.scrollHeight}px.`);
    document.body.setAttribute('data-rendering-complete', 'true');
}


function debounce(func, delay = 150) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

const debouncedAdjust = debounce(adjustContentToPage);
window.addEventListener('resize', debouncedAdjust);