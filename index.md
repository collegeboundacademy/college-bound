---
layout: default
feedback: false
hide: true
title: College Bound
description: Gateway to College Bound's Vast Resources
---

<link rel="stylesheet" href="{{ '/assets/css/home.css' | relative_url }}">

<div class="hero-shell">
	<!-- HERO ANIMATION -->
	<section class="flex flex-col items-center justify-center gap-20 py-20 select-none">
		<div class="logo-wrap drop-shadow-2xl">
			<div class="glow-burst"></div>

			<svg viewBox="0 0 320 320" class="w-24 sm:w-28 md:w-32 lg:w-36" aria-label="College Bound logo">
				<circle cx="160" cy="160" r="138" fill="#ffffff" stroke="#111" stroke-width="6"></circle>
				<path d="M 218 63 A 115 115 0 1 0 218 257" fill="none" stroke="#c62828" stroke-width="42" stroke-linecap="round"></path>
				<path d="M 216 87 A 88 88 0 1 0 216 233" fill="none" stroke="#f0b429" stroke-width="18" stroke-linecap="round"></path>
				<circle cx="160" cy="160" r="68" fill="#fff" stroke="#111" stroke-width="4"></circle>
				<polygon points="160,105 210,128 160,151 110,128" fill="#111"></polygon>
				<rect x="145" y="150" width="30" height="42" rx="6" fill="#111"></rect>
			</svg>
		</div>

		<div class="typed text-base sm:text-xl md:text-2xl font-extrabold tracking-[0.05em] text-white text-center">
			WELCOME TO COLLEGE BOUND!
		</div>
	</section>

	<!-- FLOATING FROG (floating beside the viewport) -->
	<!-- The frog stays visible on the right side and gently floats; JS nudges it while scrolling -->
	<div id="floating-frog" class="floating-frog" aria-live="polite" aria-atomic="true">
		<div class="frog-inner">
			<img src="{{ '/images/image-removebg-preview-3.png' | relative_url }}" alt="Froggy mascot" class="frog-img" />
			<div class="frog-bubble" id="frog-bubble">Hi — click your grade level to start!</div>
		</div>
	</div>

	<script>
	// Smoothly nudge the floating frog as the page scrolls
	(function(){
		const frog = document.getElementById('floating-frog');
		const bubble = document.getElementById('frog-bubble');
		if(!frog) return;

		let lastScrollY = window.scrollY;
		let currentTop = frog.getBoundingClientRect().top + window.scrollY;

		function onScroll(){
			const targetTop = window.scrollY + window.innerHeight * 0.3;
			// gentle easing
			currentTop += (targetTop - currentTop) * 0.12;
			frog.style.top = Math.max(48, currentTop - window.scrollY) + 'px';
		}

		let ticking = false;
		window.addEventListener('scroll', ()=>{
			if(!ticking){
				window.requestAnimationFrame(()=>{ onScroll(); ticking = false; });
				ticking = true;
			}
		}, { passive: true });

		// Allow clicking the bubble to toggle a short message
		if(bubble){
			bubble.addEventListener('click', ()=>{
				if(bubble.dataset.toggled === '1'){
					bubble.textContent = 'Hi — click your grade level to start!';
					bubble.dataset.toggled = '0';
				}else{
					bubble.textContent = 'Good luck — check the calendar for events.';
					bubble.dataset.toggled = '1';
				}
			});
		}
	})();
	</script>


	<!-- RESOURCES SECTION -->
	<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-slate-800 mb-6 text-center">Resources by Grade</h2>

			<div class="grade-square-grid" aria-label="Grade classes">
				<a class="grade-square-card" href="{{ '/grades/9/' | relative_url }}">9th</a>
				<a class="grade-square-card" href="{{ '/grades/10/' | relative_url }}">10th</a>
				<a class="grade-square-card" href="{{ '/grades/11/' | relative_url }}">11th</a>
				<a class="grade-square-card" href="{{ '/grades/12/' | relative_url }}">12th</a>
			</div>
		</section>
	</div>
</div>