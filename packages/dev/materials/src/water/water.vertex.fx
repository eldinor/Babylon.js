precision highp float;

// Attributes
attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif

#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>

// Uniforms
#include<instancesDeclaration>

uniform mat4 view;
uniform mat4 viewProjection;

#ifdef BUMP
varying vec2 vNormalUV;
#ifdef BUMPSUPERIMPOSE
    varying vec2 vNormalUV2;
#endif
uniform mat4 normalMatrix;
uniform vec2 vNormalInfos;
#endif

#ifdef POINTSIZE
uniform float pointSize;
#endif

// Output
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif

#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif

#include<clipPlaneVertexDeclaration>

#include<fogVertexDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]

#include<logDepthDeclaration>

// Water uniforms
uniform mat4 reflectionViewProjection;
uniform vec2 windDirection;
uniform float waveLength;
uniform float time;
uniform float windForce;
uniform float waveHeight;
uniform float waveSpeed;
uniform float waveCount;

// Water varyings
varying vec3 vRefractionMapTexCoord;
varying vec3 vReflectionMapTexCoord;




#define CUSTOM_VERTEX_DEFINITIONS

void main(void) {

#define CUSTOM_VERTEX_MAIN_BEGIN

#ifdef VERTEXCOLOR
    vec4 colorUpdated = color;
#endif

    #include<instancesVertex>
    #include<bonesVertex>
    #include<bakedVertexAnimation>

	vec4 worldPos = finalWorld * vec4(position, 1.0);
	vPositionW = vec3(worldPos);

#ifdef NORMAL
	vNormalW = normalize(vec3(finalWorld * vec4(normal, 0.0)));
#endif

	// Texture coordinates
#ifndef UV1
	vec2 uv = vec2(0., 0.);
#endif
#ifndef UV2
	vec2 uv2 = vec2(0., 0.);
#endif

#ifdef BUMP
	if (vNormalInfos.x == 0.)
	{
		vNormalUV = vec2(normalMatrix * vec4((uv * 1.0) / waveLength + time * windForce * windDirection, 1.0, 0.0));
        #ifdef BUMPSUPERIMPOSE
		    vNormalUV2 = vec2(normalMatrix * vec4((uv * 0.721) / waveLength + time * 1.2 * windForce * windDirection, 1.0, 0.0));
		#endif
	}
	else
	{
		vNormalUV = vec2(normalMatrix * vec4((uv2 * 1.0) / waveLength + time * windForce * windDirection , 1.0, 0.0));
        #ifdef BUMPSUPERIMPOSE
    		vNormalUV2 = vec2(normalMatrix * vec4((uv2 * 0.721) / waveLength + time * 1.2 * windForce * windDirection , 1.0, 0.0));
    	#endif
	}
#endif

	// Clip plane
	#include<clipPlaneVertex>

	// Fog
    #include<fogVertex>
	
	// Shadows
    #include<shadowsVertex>[0..maxSimultaneousLights]
    
	// Vertex color
#include<vertexColorMixing>

	// Point size
#if defined(POINTSIZE) && !defined(WEBGPU)
	gl_PointSize = pointSize;
#endif

	float finalWaveCount = 1.0 / (waveCount * 0.5);

#ifdef USE_WORLD_COORDINATES
	vec3 p = worldPos.xyz;
#else
	vec3 p = position;
#endif
	float newY = (sin(((p.x / finalWaveCount) + time * waveSpeed)) * waveHeight * windDirection.x * 5.0)
			   + (cos(((p.z / finalWaveCount) +  time * waveSpeed)) * waveHeight * windDirection.y * 5.0);
	p.y += abs(newY);
	
#ifdef USE_WORLD_COORDINATES
	gl_Position = viewProjection * vec4(p, 1.0);
#else
	gl_Position = viewProjection * finalWorld * vec4(p, 1.0);
#endif

#ifdef REFLECTION
	// Water
	
	vRefractionMapTexCoord.x = 0.5 * (gl_Position.w + gl_Position.x);
	vRefractionMapTexCoord.y = 0.5 * (gl_Position.w + gl_Position.y);
	vRefractionMapTexCoord.z = gl_Position.w;
	
	worldPos = reflectionViewProjection * finalWorld * vec4(position, 1.0);
	vReflectionMapTexCoord.x = 0.5 * (worldPos.w + worldPos.x);
	vReflectionMapTexCoord.y = 0.5 * (worldPos.w + worldPos.y);
	vReflectionMapTexCoord.z = worldPos.w;
#endif

#include<logDepthVertex>

#define CUSTOM_VERTEX_MAIN_END
}
