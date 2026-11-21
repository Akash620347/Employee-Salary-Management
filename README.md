# Salary Management

Angular, Spring Boot, and PostgreSQL demo for managing employee records and reviewing annual gross base salaries. Use synthetic records for this assessment demo.

Run `start-app.bat` to start PostgreSQL, the backend, and Angular. The launcher uses the `postgresql-x64-17` Windows service and waits for PostgreSQL on port `5432`. If Windows prompts for administrator approval to start the service, approve it. The launcher connects as `salary_app` to `salary_management` and reads the database password from the ignored `.local/database.bat` file or the `DATABASE_PASSWORD` environment variable. Open `http://127.0.0.1:4200/employees`.

## Backend

Install Java 21, Maven, and PostgreSQL. Create a PostgreSQL database named `salary_management` owned by your application role. Set the connection details in the terminal that starts Spring Boot.

```powershell
$env:DATABASE_URL = 'jdbc:postgresql://localhost:5432/salary_management'
$env:DATABASE_USER = 'salary_app'
$env:DATABASE_PASSWORD = Read-Host 'Database password'
Set-Location backend
mvn spring-boot:run
```

On first startup, Liquibase creates the employee table and loads 10,000 synthetic employees into an empty database. Liquibase records both changesets in `databasechangelog`, so later restarts skip them.

The backend reads `backend/src/main/resources/application.yml`. Set `SERVER_ADDRESS` or `PORT` to override the default listener at `127.0.0.1:8080`. If you change the port for local development, update the Angular proxy target in `frontend/proxy.conf.json` to match.

## Angular

Use the Taomish checkout with its dependencies installed. The frontend consumes `libs/common-ui-v2` directly and uses the same Angular, TypeScript, and supporting packages as that checkout. From the project root, point the two frontend junctions at your local checkout. Skip the junction commands if both links already exist and target the correct checkout.

```powershell
Set-Location frontend
$taomishCheckout = 'C:\Taomish-repo\taomish-ui'
New-Item -ItemType Junction -Path .taomish -Target (Join-Path $taomishCheckout 'libs/common-ui-v2')
New-Item -ItemType Junction -Path node_modules -Target (Join-Path $taomishCheckout 'node_modules')
npm start
```

Open `http://127.0.0.1:4200`. The Angular proxy forwards `/api` to `127.0.0.1:8080`. JSON page definitions are in `frontend/src/assets/application/pages`.

## Verification

```powershell
mvn -f backend/pom.xml test
node backend/scripts/check_demo.mjs
npm --prefix frontend run build
npm --prefix frontend run check:ui
```

Run the API and browser checks against the running demo with the seed loaded. Both create synthetic test employees and deactivate them as part of the workflow. The browser check uses Chrome on Windows and saves screenshots under `.local`. Set `CHROME_PATH` if Chrome is installed at a different path.

For a hosted demo, build Angular with `npm --prefix frontend run build -- --configuration production`. Serve `frontend/dist/browser` with an `index.html` fallback for Angular routes, and route `/api` to Spring Boot on the same origin. The build machine needs access to an authorized Taomish checkout and its dependencies.

Original requirements and decisions are in the [idea folder](idea/README.md).
