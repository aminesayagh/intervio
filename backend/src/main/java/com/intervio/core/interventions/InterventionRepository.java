package com.intervio.core.interventions;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface InterventionRepository extends JpaRepository<Intervention, Long> {

	Optional<Intervention> findByUuidAndCompanyId(UUID uuid, Long companyId);

	List<Intervention> findByCompanyIdOrderByUpdatedAtDesc(Long companyId);

	long countByCompanyId(Long companyId);

	/** The interventions of this company the user opened last, most recent first (decision 92). */
	@Query(value = """
			select i.* from intervention_visits v join interventions i on i.id = v.intervention_id
			where v.user_id = :userId and i.company_id = :companyId order by v.visited_at desc""", nativeQuery = true)
	List<Intervention> findVisited(Long userId, Long companyId, Limit limit);

	@Modifying
	@Query(value = """
			insert into intervention_visits (user_id, intervention_id, visited_at) values (:userId, :interventionId, now())
			on conflict (user_id, intervention_id) do update set visited_at = excluded.visited_at""", nativeQuery = true)
	void recordVisit(Long userId, Long interventionId);

	/** A document resource (type 4) for an uploaded file, linked to the intervention. */
	@Modifying
	@Query(value = """
			with r as (insert into resources (uuid, company_id, name, type, file_id, created_at, updated_at)
			           values (:uuid, :companyId, :name, 4, :fileId, now(), now()) returning id)
			insert into intervention_documents (resource_id, intervention_id, type, created_at)
			select r.id, :interventionId, :type, now() from r""", nativeQuery = true)
	void addDocument(UUID uuid, Long companyId, Long interventionId, String name, Long fileId, short type);

	/** File ids of the intervention's documents of one type, oldest first. */
	@Query(value = """
			select r.file_id from intervention_documents d join resources r on r.id = d.resource_id
			where d.intervention_id = :interventionId and d.type = :type order by d.created_at, r.id""", nativeQuery = true)
	List<Long> documentFileIds(Long interventionId, short type);

	@Query(value = "select count(*) from intervention_documents where intervention_id = :interventionId", nativeQuery = true)
	int countDocuments(Long interventionId);

}
