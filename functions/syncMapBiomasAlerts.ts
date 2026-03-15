import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const GRAPHQL_URL = 'https://plataforma.alerta.mapbiomas.org/api/v2/graphql';

async function signIn() {
  const email = Deno.env.get('MAPBIOMAS_EMAIL');
  const password = Deno.env.get('MAPBIOMAS_PASSWORD');

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation signIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            token
          }
        }
      `,
      variables: { email, password }
    })
  });

  const data = await res.json();
  if (data.errors) throw new Error('Auth failed: ' + JSON.stringify(data.errors));
  return data.data.signIn.token;
}

async function introspectSchema(token) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `
        {
          __schema {
            queryType {
              fields {
                name
                description
                args {
                  name
                  type { name kind ofType { name kind } }
                }
              }
            }
          }
        }
      `
    })
  });

  const data = await res.json();
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await signIn();
    const schema = await introspectSchema(token);

    return Response.json({ schema });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});