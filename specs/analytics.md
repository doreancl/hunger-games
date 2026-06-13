# Product Analytics

PostHog is the source of truth for product analytics. The primary journey is:

`match_started -> match_movie_used -> match_character_used -> match_finished`

## Event Rules

- Use snake_case event and property names.
- Use one scalar value per property. Do not send arrays or multiple values in one property.
- Include `match_id` in every match event so events can be joined into one journey.
- Send readable catalog names. Do not send internal franchise, movie, or character IDs.
- Do not send seeds, snapshots, custom participant names, or other user-generated content.
- Update `ruleset_version` whenever simulation rules, probabilities, event selection, character outcomes, or winner determination behavior changes.

## Common Metadata

Every named product event includes:

| Property | Type | Example |
| --- | --- | --- |
| `app_version` | string | `0.6.0` |
| `ruleset_version` | string | `v1.0.0` |
| `environment` | string | `production` |
| `match_id` | string | `match-123` |

Browser, operating system, device, URL, referrer, UTM, locale, and approximate location remain PostHog-managed properties.

## Match Journey

### `match_started`

Emitted once after the match has successfully started.

| Property | Type |
| --- | --- |
| `franchise` | string |
| `movie_count` | number |
| `roster_size` | number |
| `event_profile` | string |
| `surprise_level` | string |
| `autosave_enabled` | boolean |

Do not include `simulation_speed`; it is relevant only when analyzing a completed match.

### `match_movie_used`

Emitted once per selected movie after the match has successfully started.

| Property | Type |
| --- | --- |
| `movie` | string |
| `franchise` | string |

### `match_character_used`

Emitted once per roster character after the match has successfully started.

| Property | Type |
| --- | --- |
| `character` | string |
| `movie` | string |
| `franchise` | string |

### `match_finished`

Emitted once when the match reaches `finished`.

| Property | Type |
| --- | --- |
| `winner` | string |
| `winner_movie` | string |
| `franchise` | string |
| `roster_size` | number |
| `turn_count` | number |
| `duration_seconds` | number |
| `simulation_speed` | string |

## Required Reports

- Funnel: `match_started -> match_finished`.
- Most-used franchises grouped by `franchise`.
- Most-used movies grouped by `movie`.
- Most-used characters grouped by `character`.
- Most frequent winners grouped by `winner`.
- Completion rate and duration grouped by `roster_size` and `simulation_speed`.

## Analytics Preview

Example journey for one completed match:

```json
{
  "event": "match_started",
  "match_id": "match-123",
  "app_version": "0.6.0",
  "ruleset_version": "v1.0.0",
  "environment": "production",
  "franchise": "Star Wars",
  "movie_count": 1,
  "roster_size": 2,
  "event_profile": "balanced",
  "surprise_level": "normal",
  "autosave_enabled": true
}
```

```json
{
  "event": "match_movie_used",
  "match_id": "match-123",
  "app_version": "0.6.0",
  "ruleset_version": "v1.0.0",
  "environment": "production",
  "movie": "A New Hope",
  "franchise": "Star Wars"
}
```

```json
{
  "event": "match_character_used",
  "match_id": "match-123",
  "app_version": "0.6.0",
  "ruleset_version": "v1.0.0",
  "environment": "production",
  "character": "Luke Skywalker",
  "movie": "A New Hope",
  "franchise": "Star Wars"
}
```

```json
{
  "event": "match_finished",
  "match_id": "match-123",
  "app_version": "0.6.0",
  "ruleset_version": "v1.0.0",
  "environment": "production",
  "winner": "Luke Skywalker",
  "winner_movie": "A New Hope",
  "franchise": "Star Wars",
  "roster_size": 2,
  "turn_count": 14,
  "duration_seconds": 95,
  "simulation_speed": "2x"
}
```
