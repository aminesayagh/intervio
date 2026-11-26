package com.intervio.core.interventions;

import org.springframework.stereotype.Service;

/** What other services may ask about interventions. */
@Service
public class Interventions {

	private final InterventionRepository interventions;

	Interventions(InterventionRepository interventions) {
		this.interventions = interventions;
	}

	/** Whether the company has published an intervention, which involves bidders (decision 90). */
	public boolean anyPublished(Long companyId) {
		return interventions.existsByCompanyIdAndPublishedAtIsNotNull(companyId);
	}

}
