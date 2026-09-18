## 9. Environment

### 9.1 Desktop distribution

#### 9.1.4 API Endpoints v1

##### 9.1.4.1 Basic Rules

* Base path:

  * `/api/v1/`

* Path parameters:

  * `{p}`: Party number, `1–6`.
  * `{characterId}`: Character ID.
  * `{diaryEntryId}`: Stable Diary-entry ID.

* Endpoint groups:

  * `fundamental/*`: API session and user control.
  * `read/*`: Read game state.
    * Does not modify game state.
  * `commit/*`: Modify game state.
    * Atomic.
    * If validation fails, no supplied change is committed.
  * `help/*`: API usage and endpoint information.
    * Does not modify game state.
  * `resources/*`: Reference information.
    * Does not modify game state.

* Common Formats:

  * See the corresponding definitions in `Specification_9.1.3_API.md`.


* Definitions:

  * `current`
    * Current value or current configuration.

  * `editableFields`
    * Indicates which fields can currently be changed.

  * `validOptions`
    * Values currently accepted by the corresponding Commit API.
    * Values returned by Read APIs may be passed directly to the corresponding Commit API.

---

##### 9.1.4.2 Endpoint Index

| Method | Endpoint                     |
| ------ | ---------------------------- |
| `GET`  | `/api/v1/fundamental/status` |
| `POST` | `/api/v1/fundamental/signUp` |
| `POST` | `/api/v1/fundamental/logIn`  |
| `POST` | `/api/v1/fundamental/logOut` |
| `GET`  | `/api/v1/read/observation`   |
| ...    | ...                          |

---

##### 9.1.4.3 Fundamental

###### `GET /api/v1/fundamental/status`

* Purpose:

  * Get API/runtime status.

* Input:

```json
{}
```

* Output:

```json
{
  "systemStatus": "...",
  "versionBuild": "...",
  "environment": "..."
}
```

---

##### 9.1.4.4 Read

---

##### 9.1.4.5 Commit

---

##### 9.1.4.6 Help

---

##### 9.1.4.7 Error principle




[EOF]

